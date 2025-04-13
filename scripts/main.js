class BlogPostsWidget {
  constructor(container) {
    this.container = container;
    this.API_BASE = 'https://www.sudaneye.site/feeds/posts/default';
    this.init();
  }

  async init() {
    try {
      const [max, category] = this.parseContainerData();
      const apiUrl = this.buildApiUrl(category, max);
      await this.delayRequest();
      const response = await this.fetchData(apiUrl);
      if (!response.feed || !response.feed.entry) throw new Error('لا توجد مقالات متاحة');
      const posts = this.processPosts(response.feed.entry);
      this.renderPosts(posts);
    } catch (error) {
      this.showError(error.message);
    }
  }

  async delayRequest() {
    return new Promise(resolve => setTimeout(resolve, 2000));
  }

  parseContainerData() {
    const rawData = this.container.dataset.config || '6/recent';
    return rawData.split('/').map(part => part.trim());
  }

  buildApiUrl(category, maxResults) {
    const params = `alt=json-in-script&max-results=${maxResults}`;
    return category === 'recent' 
      ? `${this.API_BASE}?${params}`
      : `${this.API_BASE}/-/${encodeURIComponent(category)}?${params}`;
  }

  async fetchData(url) {
    return new Promise((resolve, reject) => {
      const callbackName = `jsonp_${Date.now()}`;
      const timeout = setTimeout(() => reject(new Error('مهلة الطلب انتهت')), 20000);

      window[callbackName] = (data) => {
        clearTimeout(timeout);
        delete window[callbackName];
        document.head.removeChild(script);
        resolve(data);
      };

      const script = document.createElement('script');
      script.src = `${url}&callback=${callbackName}`;
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('فشل في تحميل البيانات'));
      };
      document.head.appendChild(script);
    });
  }

  processPosts(entries) {
    return entries.map(entry => {
      const content = entry.content?.$t || entry.summary?.$t || '';
      const snippet = this.stripHtml(content).split(/\s+/).slice(0, 20).join(' ') + '...';
      return {
        title: this.sanitize(entry.title.$t),
        url: entry.link.find(l => l.rel === 'alternate').href,
        image: this.getImageUrl(content),
        snippet
      };
    });
  }

  getImageUrl(content) {
    const imgMatch = content.match(/<img[^>]+src=["'](.*?)["']/);
    return imgMatch 
      ? imgMatch[1]
      : 'https://via.placeholder.com/300x200?text=SudanEye';
  }

  stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  sanitize(text) {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  renderPosts(posts) {
    const rows = posts.map(post => `
      <div class="col-md-4 mb-4">
        <article class="blog-post h-100 d-flex flex-column shadow-sm border rounded overflow-hidden">
          <a href="${post.url}" class="post-image d-block">
            <img src="${post.image}" class="img-fluid" alt="${post.title}" loading="lazy">
          </a>
          <div class="p-3 d-flex flex-column flex-grow-1">
            <h5 class="post-title mb-2"><a href="${post.url}">${post.title}</a></h5>
            <p class="text-muted small flex-grow-1">${post.snippet}</p>
            <a href="${post.url}" class="btn btn-outline-primary btn-sm mt-2 align-self-start">اقرأ المزيد</a>
          </div>
        </article>
      </div>
    `).join('');

    this.container.innerHTML = `<div class="row">${rows}</div>`;
  }

  showError(message) {
    this.container.innerHTML = `
      <div class="alert alert-warning text-center" role="alert">
        ⚠️ ${message}
      </div>
    `;
  }
}

// **تشغيل الويدجت**
document.addEventListener('DOMContentLoaded', async () => {
  const containers = document.querySelectorAll('[data-config]');
  for (let i = 0; i < containers.length; i++) {
    new BlogPostsWidget(containers[i]);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
});
