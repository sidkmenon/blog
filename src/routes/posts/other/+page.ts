import Papa from 'papaparse';
import csvData from '$lib/assets/books/goodreads_data.csv?raw';
import type { PageLoad } from './$types';

interface GoodreadsRow {
	Title: string;
	Author: string;
	'Original Publication Year': string;
}

export interface Book {
	title: string;
	author: string;
	originalPublicationYear: number | null;
}

export const prerender = true;

export const load: PageLoad = () => {
	const parsed = Papa.parse<GoodreadsRow>(csvData, {
		header: true,
		skipEmptyLines: true
	});

	const books: Book[] = parsed.data.map((row) => {
		const yearStr = row['Original Publication Year'];
		const year = yearStr ? parseInt(yearStr, 10) : null;

		return {
			title: cleanTitle(row.Title),
			author: row.Author,
			originalPublicationYear: isNaN(year!) ? null : year
		};
	});

	books.sort((a, b) => a.author.localeCompare(b.author));

	return { books };
};

function cleanTitle(title: string): string {
	return title.replace(/\s*\([^)]*#\d+\)$/, '');
}
