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

function normalizeOwnAssetUrl(assetUrl: string): string {
	try {
		const parsed = new URL(assetUrl, 'https://csrspinozzi.com');
		const isOwnHost = ['csrspinozzi.com', 'www.csrspinozzi.com'].includes(parsed.hostname);
		if (isOwnHost && parsed.pathname.startsWith('/wp-content/uploads/')) {
			return `${parsed.pathname}${parsed.search}`;
		}
	} catch {
		// Keep malformed or relative URLs untouched.
	}
	return assetUrl;
}

function toWebpIfAvailable(assetUrl: string): string {
	assetUrl = normalizeOwnAssetUrl(assetUrl);
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

function toReadableLabel(value: string): string {
	return value
		.replace(/[-_]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function deriveAltFromSrc(src: string): string {
	try {
		const url = new URL(src, 'https://csrspinozzi.com');
		const filename = path.basename(url.pathname);
		const withoutExt = filename.replace(/\.[a-z0-9]+$/i, '');
		const withoutSizeSuffix = withoutExt.replace(/-\d+x\d+$/i, '');
		const label = toReadableLabel(withoutSizeSuffix);
		return label || 'Project image';
	} catch {
		return 'Project image';
	}
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

		const srcsetMatch = next.match(/\ssrcset=(["'])([^"']+)\1/i);
		if (srcsetMatch) {
			const optimizedSrcset = srcsetMatch[2]
				.split(',')
				.map((candidate) => {
					const [url, descriptor] = candidate.trim().split(/\s+/, 2);
					return [toWebpIfAvailable(url), descriptor].filter(Boolean).join(' ');
				})
				.join(', ');
			next = next.replace(srcsetMatch[0], ` srcset="${optimizedSrcset}"`);
		}

		if (!/\sloading=/i.test(next)) {
			next = next.replace('<img', '<img loading="lazy"');
		}

		if (!/\sdecoding=/i.test(next)) {
			next = next.replace('<img', '<img decoding="async"');
		}

		const fallbackAlt = srcMatch ? deriveAltFromSrc(srcMatch[2]) : 'Project image';
		if (!/\salt=/i.test(next)) {
			next = next.replace('<img', `<img alt="${fallbackAlt}"`);
		} else {
			next = next.replace(/\salt=(["'])\s*\1/i, ` alt="${fallbackAlt}"`);
		}

		return next;
	});
}

function addAccessibleLabelsToImageLinks(html: string): string {
	return html.replace(/<a\b([^>]*)>(\s*<img\b[^>]*>\s*)<\/a>/gi, (match, attrs, body) => {
		if (/\saria-label=/i.test(attrs)) return match;

		const altMatch = body.match(/\salt=(["'])([^"']+)\1/i);
		let label = altMatch?.[2]?.trim() || '';

		if (!label) {
			const hrefMatch = attrs.match(/\shref=(["'])([^"']+)\1/i);
			if (hrefMatch) {
				try {
					const host = new URL(hrefMatch[2], 'https://csrspinozzi.com').hostname.replace(/^www\./, '');
					label = `Open ${host}`;
				} catch {
					label = 'Open link';
				}
			}
		}

		if (!label) label = 'Open link';
		return `<a${attrs} aria-label="${label}">${body}</a>`;
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

	return addAccessibleLabelsToImageLinks(optimizeImageTags(withYoutubeEmbeds));
}
