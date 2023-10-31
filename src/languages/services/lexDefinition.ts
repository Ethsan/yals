import {
	Position,
	Definition,
	Location,
	Range,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { LexDocument, ISymbol } from '../parser/lexParser';
import { getWordRangeAtPosition } from './utils';

export function doLEXFindDefinition(
	document: TextDocument,
	position: Position,
	lexDocument: LexDocument,
): Definition | null {
	const offset = document.offsetAt(position);
	const node = lexDocument.getEmbeddedCode(offset);
	if (node) {
		return null;
	}

	const word = document.getText(
		getWordRangeAtPosition(document, position),
	);
	var symbol: ISymbol | undefined =
		lexDocument.defines[word] || lexDocument.states[word];
	let location: Location | null = null;
	if (symbol) {
		location = {
			uri: document.uri,
			range: {
				start: document.positionAt(
					symbol.definition[0],
				),
				end: document.positionAt(symbol.definition[1]),
			},
		};
	}
	return location;
}
