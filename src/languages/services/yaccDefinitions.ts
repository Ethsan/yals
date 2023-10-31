import {
	Position,
	Definition,
	Location,
	Range,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { YACCDocument, ISymbol } from '../parser/yaccParser';
import { getWordRangeAtPosition } from './utils';

export function doYACCFindDefinition(
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
	var symbol: ISymbol | undefined =
		yaccDocument.types[word] ||
		yaccDocument.symbols[word] ||
		yaccDocument.tokens[word] ||
		yaccDocument.aliases[`"${word}"`];
	let location: Location | null = null;
	if (symbol) {
		const range = {
			start: document.positionAt(symbol.definition[0]),
			end: document.positionAt(symbol.definition[1]),
		};
		location = { uri: document.uri, range: range };
	}
	return location;
}
