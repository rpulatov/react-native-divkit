export function getUrlSchema(url: string): string {
    if (url.startsWith('tel:')) {
        return 'tel';
    }

    if (url.startsWith('/')) {
        return 'https';
    }

    const match = /^([^/]+):\/\//.exec(url);

    return match && match[1] || '';
}
