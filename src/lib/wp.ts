import { existsSync } from 'node:fs';
import path from 'node:path';

export function stripHtml(html: string): string {
	return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function decodeEntities(text: string): string {
	return text
		.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
		.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>');
}

function getYoutubeEmbedUrl(url: string): string | null {
	try {
		const parsed = new URL(url);
		let id = '';

		if (parsed.hostname.includes('youtu.be')) {
			id = parsed.pathname.replace('/', '');
		} else if (parsed.hostname.includes('youtube.com')) {
			id = parsed.searchParams.get('v') || '';
			if (!id && parsed.pathname.startsWith('/shorts/')) {
				id = parsed.pathname.split('/')[2] || '';
			}
		}

		if (!id) return null;
		return `https://www.youtube.com/embed/${id}`;
	} catch {
		return null;
	}
}

function toWebpIfAvailable(assetUrl: string): string {
	if (!assetUrl.startsWith('/wp-content/uploads/')) return assetUrl;
	const parsed = assetUrl.split('?')[0];
	const ext = path.extname(parsed).toLowerCase();
	if (!['.png', '.jpg', '.jpeg'].includes(ext)) return assetUrl;

	const webpUrl = parsed.replace(/\.(png|jpe?g)$/i, '.webp');
	const webpPath = path.join(process.cwd(), 'public', webpUrl.replace(/^\//, ''));
	if (!existsSync(webpPath)) return assetUrl;

	const query = assetUrl.includes('?') ? assetUrl.slice(assetUrl.indexOf('?')) : '';
	return `${webpUrl}${query}`;
}

function optimizeImageTags(html: string): string {
	return html.replace(/<img\b[^>]*>/g, (tag) => {
		let next = tag;

		const srcMatch = next.match(/\ssrc=(["'])([^"']+)\1/i);
		if (srcMatch) {
			const src = srcMatch[2];
			const optimizedSrc = toWebpIfAvailable(src);
			if (optimizedSrc !== src) {
				next = next.replace(srcMatch[0], ` src="${optimizedSrc}"`);
			}
		}

		if (!/\sloading=/i.test(next)) {
			next = next.replace('<img', '<img loading="lazy"');
		}

		if (!/\sdecoding=/i.test(next)) {
			next = next.replace('<img', '<img decoding="async"');
		}

		return next;
	});
}

export function transformWordPressHtml(html: string): string {
	const withYoutubeEmbeds = html.replace(
		/(<div[^>]*elementor-widget-video[\s\S]*?data-settings="([^"]+)"[\s\S]*?<div class="elementor-video">)([\s\S]*?)(<\/div>)/g,
		(match, before, encodedSettings, inside, close) => {
			const settingsRaw = decodeEntities(encodedSettings);
			let settings: { youtube_url?: string } | null = null;
			try {
				settings = JSON.parse(settingsRaw);
			} catch {
				return match;
			}

			const youtubeUrl = settings?.youtube_url;
			if (!youtubeUrl) return match;

			const embedUrl = getYoutubeEmbedUrl(youtubeUrl);
			if (!embedUrl) return match;

			const iframe = `<iframe src="${embedUrl}" title="YouTube video player" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
			return `${before}${iframe}${close}`;
		}
	);

	return optimizeImageTags(withYoutubeEmbeds);
}
