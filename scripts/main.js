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
    return entries.map(entry => ({
      title: this.sanitize(entry.title.$t),
      url: entry.link.find(l => l.rel === 'alternate').href,
      image: this.getImageUrl(entry),
    }));
  }

  getImageUrl(entry) {
    const content = entry.content?.$t || entry.summary?.$t || '';
    const imgMatch = content.match(/<img[^>]+src=["'](.*?)["']/);
    return imgMatch 
      ? imgMatch[1]
      : 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMDAgMjAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiI+2KfZhNio2YrYqTwvdGV4dD48L3N2Zz4=';
  }

  sanitize(text) {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  renderPosts(posts) {
    this.container.innerHTML = posts.map(post => `
      <article class="blog-post">
        <div class="post-content-wrapper">
          <a href="${post.url}" class="post-image">
            <img src="${post.image}" alt="${post.title}" loading="lazy">
          </a>
          <div class="text-content">
            <h3 class="post-title"><a href="${post.url}">${post.title}</a></h3>
          </div>
        </div>
      </article>
    `).join('');
  }

  showError(message) {
    this.container.innerHTML = `
      <div class="blog-error">
        <p>⚠️ ${message}</p>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const containers = document.querySelectorAll('[data-config]');
  for (let i = 0; i < containers.length; i++) {
    new BlogPostsWidget(containers[i]);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
});
