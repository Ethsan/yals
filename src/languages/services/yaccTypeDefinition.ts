import { Position, Definition, Location } from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { YACCDocument, ISymbol } from '../parser/yaccParser';
import { getWordRangeAtPosition } from './utils';
export function doYACCFindTypeDefinition(
	document: TextDocument,
	position: Position,
	yaccDocument: YACCDocument,
): Definition | null {
	const offset = document.offsetAt(position);
	const node = yaccDocument.getEmbeddedNode(offset);
	if (node) {
		return null;
	}

	const word = document.getText(
		getWordRangeAtPosition(document, position),
	);
	const symbol: ISymbol | undefined =
		yaccDocument.symbols[word] ||
		yaccDocument.tokens[word] ||
		yaccDocument.aliases[`"${word}"`];
	let location: Location | null = null;
	if (symbol && symbol.type) {
		const type = yaccDocument.types[symbol.type];
		if (type) {
			location = {
				uri: document.uri,
				range: {
					start: document.positionAt(
						symbol.definition[0],
					),
					end: document.positionAt(
						symbol.definition[1],
					),
				},
			};
		}
	}
	return location;
}
