export default {
  async fetch(request, env) {
    // Assets are at dist/admin/* so /admin/* requests map directly
    let res = await env.ASSETS.fetch(request);

    // SPA fallback: if no asset found, serve index.html
    if (res.status === 404) {
      const url = new URL(request.url);
      url.pathname = '/admin/index.html';
      res = await env.ASSETS.fetch(url.toString());
    }

    return res;
  },
};
