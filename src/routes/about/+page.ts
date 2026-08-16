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
		const year = Number.parseInt(row['Original Publication Year'], 10);

		return {
			title: row.Title.replace(/\s*\([^)]*#\d+\)$/, ''),
			author: row.Author,
			originalPublicationYear: Number.isNaN(year) ? null : year
		};
	});

	books.sort((a, b) => a.author.localeCompare(b.author));

	return { books };
};
