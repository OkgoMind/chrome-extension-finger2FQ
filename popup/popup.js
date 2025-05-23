document.addEventListener('DOMContentLoaded', function () {
  const keywordsGrid = document.querySelector('.keywords-grid')
  const searchInput = document.getElementById('searchInput')

  const fofaBtn = document.getElementById('fofaBtn')
  const quakeBtn = document.getElementById('quakeBtn')

  const gotoBtn = document.getElementById('gotoBtn')
  const copyBtn = document.getElementById('copyBtn')

  const resultSection = document.querySelector('.result-section')
  const keywordTags = document.getElementById('keywordTags')

  const FOFA = 'FOFA'
  const QUAKE = 'QUAKE'
  let currentQueryType = ''
  let rawFaviconContent = ''
  let selectedKeywords = []

  isDynamicPage()
  genKeywordsBlocks()

  // FOFA button click event
  fofaBtn.addEventListener('click', function () {
    currentQueryType = FOFA
    let searchValue = ''
    if (selectedKeywords.length > 1) {
      tmpValue = []
      for (let i = 0; i < selectedKeywords.length; i++) {
        cur_searchQuery = handleKeywords(selectedKeywords[i], FOFA)
        tmpValue.push(cur_searchQuery)
      }
      searchValue = tmpValue.join(' && ')
    } else if (selectedKeywords.length === 1) {
      searchValue = handleKeywords(selectedKeywords[0], FOFA)
    } else {
      searchValue = handleKeywords(searchInput.value.trim(), FOFA)
    }
    const searchQuery = document.getElementById('searchQuery')

    if (!searchValue) {
      searchInput.placeholder = '输入条件不能为空...'
      setTimeout(() => {
        searchInput.placeholder = '点击上面的关键字，以选择输入条件...'
      }, 1500)
      return
    }

    searchQuery.textContent = searchValue

    resultSection.classList.remove('hidden')
    resultSection.classList.add('show')  // 修改这里
  })

  // QUAKE button click event
  quakeBtn.addEventListener('click', function () {
    currentQueryType = QUAKE
    let searchValue = ''
    if (selectedKeywords.length > 1) {
      tmpValue = []
      for (let i = 0; i < selectedKeywords.length; i++) {
        cur_searchQuery = handleKeywords(selectedKeywords[i], QUAKE)
        tmpValue.push(cur_searchQuery)
      }
      searchValue = tmpValue.join(' AND ')
    } else if (selectedKeywords.length === 1) {
      searchValue = handleKeywords(selectedKeywords[0], QUAKE)
    } else {
      searchValue = handleKeywords(searchInput.value.trim(), QUAKE)
    }
    const searchQuery = document.getElementById('searchQuery')

    if (!searchValue) {
      searchInput.placeholder = '输入条件不能为空...'
      setTimeout(() => {
        searchInput.placeholder = '点击上面的关键字，以选择输入条件...'
      }, 1500)
      return
    }

    searchQuery.textContent = searchValue

    resultSection.classList.remove('hidden')
    resultSection.classList.add('show')
  })

  // GOTO button event handler
  gotoBtn.addEventListener('click', function () {
    const searchQuery = document.getElementById('searchQuery')
    const queryText = searchQuery.textContent

    let gotoURL = ""
    switch (currentQueryType) {
      case FOFA:
        var encoder = new TextEncoder()
        var bytes = encoder.encode(queryText)
        var encodedQuery = btoa(String.fromCharCode.apply(null, bytes))
        gotoURL = `https://fofa.info/result?qbase64=${encodeURIComponent(encodedQuery)}`
        break
      case QUAKE:
        gotoURL = `https://quake.360.net/quake/#/searchResult?searchVal=${encodeURIComponent(queryText)}&selectIndex=quake_service&latest=true`
        break
    }
    chrome.tabs.create({ url: gotoURL })
  })

  // Copy button event handler
  copyBtn.addEventListener('click', function () {
    const searchQuery = document.getElementById('searchQuery')
    navigator.clipboard.writeText(searchQuery.textContent)
      .then(() => {
        copyBtn.textContent = 'Copied'
        setTimeout(() => {
          copyBtn.textContent = 'COPY'
        }, 2000)
      })
      .catch(err => {
        console.error('Copy failed:', err)
      })
  })

  // Generate keywords blocks
  function genKeywordsBlocks () {
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
      const currentTab = tabs[0]
      const url = new URL(currentTab.url)

      await createFaviconBlock(currentTab.favIconUrl || `${url.origin}/favicon.ico`)

      createTitleBlock(currentTab.title)

      createDomainBlock(url.hostname)

      // Directly extract JS and CSS URLs using scripting
      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          func: extractUrlsInPage, // Function defined below
        });
        if (result && result.js && result.css) {
          createJsCssBlocks(result.js, result.css);
        } else {
          console.warn('Finger Finder: No JS/CSS URLs extracted or result format incorrect.');
        }
      } catch (error) {
        console.error('Finger Finder: Error executing script to extract URLs:', error);
        // Handle potential errors, e.g., if scripting access is denied
      }
    })
  }

  // Function to be injected into the page to extract URLs
  function extractUrlsInPage() {
    // Define exclusion lists directly within the function
    const excludeList = [
      'bootstrap',
      'chosen',
      'bootbox',
      'awesome', // font-awesome
      'animate',
      'picnic',
      'cirrus',
      'iconfont',
      'jquery',
      'layui',
      'swiper',
      'vue',
      'react',
      'angular'
    ];
    const excludePaths = [
      '/',
      '//',
      '/favicon.ico',
      '/login',
      '/register',
      '/login.html',
      '/register.html'
    ];

    let jsUrls = new Set();
    let cssUrls = new Set();
    const baseUrl = document.baseURI;
    const baseOrigin = new URL(baseUrl).origin;

    // Extract JS URLs
    document.querySelectorAll('script[src]').forEach(script => {
      let src = script.getAttribute('src');
      if (src) {
        try {
          const absoluteUrl = new URL(src, baseUrl);
          let urlToAdd = src; // Default to original src

          // If the absolute URL is on the same origin, use the path
          if (absoluteUrl.origin === baseOrigin) {
            urlToAdd = absoluteUrl.pathname + absoluteUrl.search;
          }

          // Check exclusions based on the processed URL (path or original)
          const urlWithoutQuery = urlToAdd.split('?')[0];
          if (!excludePaths.includes(urlWithoutQuery) && !excludeList.some(ex => urlWithoutQuery.toLowerCase().includes(ex))) {
            jsUrls.add(urlToAdd);
          }
        } catch (e) {
          // Ignore parsing errors silently in content script
          // Maybe add the original src if parsing fails but it's not excluded?
          // For now, keep it simple: if parsing fails, we don't add it.
        }
      }
    });

    // Extract CSS URLs
    document.querySelectorAll('link[rel="stylesheet"][href]').forEach(link => {
      let href = link.getAttribute('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl);
          let urlToAdd = href; // Default to original href

          // If the absolute URL is on the same origin, use the path
          if (absoluteUrl.origin === baseOrigin) {
            urlToAdd = absoluteUrl.pathname + absoluteUrl.search;
          }

          // Check exclusions based on the processed URL (path or original)
          const urlWithoutQuery = urlToAdd.split('?')[0];
          if (!excludePaths.includes(urlWithoutQuery) && !excludeList.some(ex => urlWithoutQuery.toLowerCase().includes(ex))) {
            cssUrls.add(urlToAdd);
          }
        } catch (e) {
          // Ignore parsing errors silently in content script
        }
      }
    });

    return {
      js: Array.from(jsUrls),
      css: Array.from(cssUrls)
    };
  }

  // Create keyword box
  function createKeywordBox(text, keyword) {
    const box = document.createElement('div')
    box.className = 'keyword-box clickable'
    box.textContent = text
    box.setAttribute('data-keyword', keyword || '')
    // 添加完整内容作为 tooltip
    box.title = text
  
    box.addEventListener('click', function() {
      if (this.getAttribute('data-keyword')) {
        searchInput.value = this.getAttribute('data-keyword')
        document.querySelectorAll('.keyword-box').forEach(b => b.classList.remove('active'))
        this.classList.add('active')
      }
    })

    box.addEventListener('dblclick', function () {
      console.log('dblclick')
      if (this.getAttribute('data-keyword')) {
        const value = this.getAttribute('data-keyword')
        const idx = selectedKeywords.indexOf(value)
        if (idx !== -1) {
          selectedKeywords.splice(idx, 1)
        } else {
          selectedKeywords.push(value)
        }
        renderKeywordTags()
      }
    })

    keywordsGrid.appendChild(box)
  }

  // Create favicon content
  function createFaviconBlock (faviconUrl) {
    fetch(faviconUrl)
      .then(response => response.blob())
      .then(blob => {
        // Convert blob to ArrayBuffer
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsArrayBuffer(blob)
        })
      })
      .then(arrayBuffer => {
        rawFaviconContent = arrayBuffer

        // create favicon keyword box
        createKeywordBox('favicon', `icon="${faviconUrl}"`)
      })
      .catch(error => {
        console.error('Error fetching favicon:', error)
      })
  }

  // Create title keyword box
  function createTitleBlock (title) {
    createKeywordBox('Title', `title="${title}"`)
  }

  // Create domain keyword box
  function createDomainBlock (hostname) {
    // Regex to check for IPv4 address format
    const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    let domain = hostname;

    // Check if hostname is an IPv4 address
    if (!ipv4Regex.test(hostname)) {
      const domainParts = hostname.split('.');
      const len = domainParts.length;
      // Common second-level domains that might precede a country code TLD
      const commonSLDs = ['com', 'ac', 'org', 'gov', 'net', 'edu', 'co'];

      if (len >= 3 && commonSLDs.includes(domainParts[len - 2].toLowerCase()) && domainParts[len - 1].length <= 3) {
        // Handle cases like example.com.cn, example.co.uk (take last 3 parts)
        domain = domainParts.slice(-3).join('.');
      } else if (len >= 2) {
        // Handle cases like example.com, example.org (take last 2 parts)
        domain = domainParts.slice(-2).join('.');
      }
      // If len < 2 (e.g., 'localhost'), domain remains hostname
    }
    createKeywordBox('Domain', `domain="${domain}"`);
  }

  // Create JS and CSS keyword blocks
  function createJsCssBlocks(jsUrls, cssUrls) {
    jsUrls.forEach(url => {
      const filename = url.substring(url.lastIndexOf('/') + 1);
      createKeywordBox(`JS: ${filename}`, `body="${url}"`); // Use body search for URLs
    });
    cssUrls.forEach(url => {
      const filename = url.substring(url.lastIndexOf('/') + 1);
      createKeywordBox(`CSS: ${filename}`, `body="${url}"`); // Use body search for URLs
    });
  }

  async function isDynamicPage () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'get_isVue' }, function (response) {
        if (chrome.runtime.lastError) {
          // console.log('Error:', chrome.runtime.lastError);
          return
        }

        if (response && response.isVue) {
          document.getElementById('vueIndicator').classList.remove('hidden')
        }
      })
    })
  }

  function handleKeywords (keyword, queryType) {
    searchQuery = ""
    if (queryType === FOFA) {
      if (keyword.startsWith('icon=')) {
        if (rawFaviconContent) {
          // Convert ArrayBuffer to base64 and add line breaks
          const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(rawFaviconContent)))
          const base64WithNewlines = base64.replace(/.{76}/g, '$&\n') + '\n'

          // Calculate MurmurHash3
          const hash = MurmurHash3.hashBytes(base64WithNewlines, base64WithNewlines.length, 0)
          searchQuery = `icon_hash="${hash}"`

        } else {
          searchQuery = keyword
        }
      } else if (keyword.startsWith('title=')) {
        searchQuery = keyword.replace(/^Title=/, 'title=')
      } else if (keyword.startsWith('domain=')) {
        searchQuery = keyword.replace(/^Domain=/, 'domain=')
      } else if (keyword.startsWith('body=')) {
        // 保持 FOFA 的 body 语法格式
        searchQuery = keyword
      } else if (keyword.startsWith('icp=')) {
        // 转换为 FOFA 的 icp 语法格式
        const icpValue = keyword.replace('icp="', '').replace('"', '')
        searchQuery = `icp="${icpValue}"`
      } else {
        searchQuery = keyword
      }

    } else if (queryType === QUAKE) {
      if (keyword.startsWith('icon=')) {
        const wordArray = CryptoJS.lib.WordArray.create(rawFaviconContent)
        const md5 = CryptoJS.MD5(wordArray).toString()
        searchQuery = `favicon:"${md5}"`
      } else if (keyword.startsWith('title=')) {
        // Extract title value and convert to Quake syntax
        const titleValue = keyword.replace('title="', '').replace('"', '')
        searchQuery = `title:"${titleValue}"`
      } else if (keyword.startsWith('domain=')) {
        // Extract domain value and convert to Quake syntax
        const domainValue = keyword.replace('domain="', '').replace('"', '')
        searchQuery = `domain:"${domainValue}"`
      } else if (keyword.startsWith('body=')) {
        // 转换为 Quake 的 body 语法格式
        const bodyValue = keyword.replace('body="', '').replace('"', '')
        searchQuery = `body:"${bodyValue}"`
      } else if (keyword.startsWith('icp=')) {
        // 转换为 Quake 的 icp 语法格式
        const icpValue = keyword.replace('icp="', '').replace('"', '')
        searchQuery = `icp:"${icpValue}"`
      } else {
        searchQuery = keyword
      }
    }

    return searchQuery
  }

  const aiAnalyzeBtn = document.getElementById('aiAnalyzeBtn');
  
  // AI 分析按钮点击事件
  aiAnalyzeBtn.addEventListener('click', async function() {
    const button = this;
    const buttonText = button.querySelector('.button-content');
    const spinner = button.querySelector('.loading-spinner');

    try {
      // 更新按钮状态
      button.disabled = true;
      buttonText.textContent = '分析中...';
      spinner.classList.remove('hidden');

      // 获取当前标签页的原始HTML源码
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const [{ result: htmlContent }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: async () => {
          const response = await fetch(window.location.href);
          return await response.text();
        }
      });

      // 获取存储的API设置
      const { apiKey, apiEndpoint, model } = await new Promise(resolve => {
        chrome.storage.sync.get(['apiKey', 'apiEndpoint', 'model'], resolve);
      });

      if (!apiKey || !apiEndpoint) {
        throw new Error('请先在设置页面配置 API 信息');
      }

      // 创建API实例并发送请求
      const api = new AIApi(apiKey, apiEndpoint, model);
      const response = await api.analyzeWebPage(htmlContent);

      if (!response.choices || !response.choices[0].message) {
        throw new Error('AI 响应格式不正确');
      }

      const analysisResult = response.choices[0].message.content;
      try {
        // 解析 JSON 结果
        const features = JSON.parse(analysisResult).data;
        console.log('Parsed features:', features);
        
        // 处理每个特征并生成关键词块
        features.forEach(feature => {
          let keyword = '';
          let text = '';
          
          switch(feature.location) {
            case 'title':
              text = `Title(AI)`;
              keyword = `title="${feature.content}"`;
              break;
            case 'icp':
              text = `ICP(AI)`;
              keyword = `icp="${feature.content}"`;
              break;
            default: // body
              // 截取内容前20个字符，如果超过则添加省略号
              const shortContent = feature.content.length > 20 
                ? feature.content.substring(0, 20) + '...' 
                : feature.content;
              text = `Body(AI): ${shortContent}`;
              keyword = `body="${feature.content}"`;
              break;
          }
          
          // 创建关键词块
          createKeywordBox(text, keyword);
        });

      } catch (error) {
        console.error('解析 AI 分析结果失败:', error);
        throw new Error('AI 返回的结果格式不正确');
      }

    } catch (error) {
      console.error('AI Analysis Error:', error);
      alert(error.message);
    } finally {
      // 恢复按钮状态
      button.disabled = false;
      buttonText.textContent = 'AI 分析';
      spinner.classList.add('hidden');
    }
  });

  // render keyword tags section
  function renderKeywordTags() {
    keywordTags.innerHTML = ''
    selectedKeywords.forEach((keyword, idx) => {
      const tag = document.createElement('span')
      tag.className = 'keyword-tag'
      tag.textContent = keyword
      // create remove-selected tag button
      const removeBtn = document.createElement('span')
      removeBtn.className = 'remove-tag-btn'
      removeBtn.textContent = ' ×'
      removeBtn.addEventListener('click', () => {
        selectedKeywords.splice(idx, 1)
        renderKeywordTags()
      })
      tag.appendChild(removeBtn)
      keywordTags.appendChild(tag)
    })
  }

});