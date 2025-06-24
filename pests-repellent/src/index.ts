export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const referer = request.headers.get('referer') || '';
		const secFetchSite = request.headers.get('sec-fetch-site') || '';

		// TODO: make this

		// const knownFakeDomains = ["fakesite.example", "evilframe.net"]
		// const isSuspicious = knownFakeDomains.some(domain => referer.includes(domain))
		//
		if (
			// isSuspicious ||
			secFetchSite === 'cross-site'
		) {
			return Response.redirect('https://fmhy.net', 302);
		}

		const res = await fetch(request);

		const modifiedHeaders = new Headers(res.headers);
		modifiedHeaders.set('X-Frame-Options', 'DENY');
		modifiedHeaders.set('Content-Security-Policy', "frame-ancestors 'none'");

		return new Response(res.body, {
			status: res.status,
			statusText: res.statusText,
			headers: modifiedHeaders,
		});
	},
} satisfies ExportedHandler<Env>;
