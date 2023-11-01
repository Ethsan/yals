import { Position, Location } from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { YACCDocument, ISymbol } from '../parser/yaccParser';
import { getWordRangeAtPosition } from './utils';

export function doYACCFindReferences(
	document: TextDocument,
	position: Position,
	yaccDocument: YACCDocument,
): Location[] {
	const offset = document.offsetAt(position);
	const node = yaccDocument.getEmbeddedNode(offset);
	if (node) {
		return [];
	}

	const word = document.getText(
		getWordRangeAtPosition(document, position),
	);
	const symbol: ISymbol | undefined =
		yaccDocument.types[word] ||
		yaccDocument.symbols[word] ||
		yaccDocument.tokens[word] ||
		yaccDocument.aliases[`"${word}"`];
	const location: Location[] = [];
	symbol?.references.forEach((reference) => {
		const range = {
			start: document.positionAt(reference[0]),
			end: document.positionAt(reference[1]),
		};
		location.push({ uri: document.uri, range: range });
	});
	symbol?.alias?.references.forEach((reference) => {
		const range = {
			start: document.positionAt(reference[0]),
			end: document.positionAt(reference[1]),
		};
		location.push({ uri: document.uri, range: range });
	});
	return location;
}
