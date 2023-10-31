import { Hover, Position } from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { LexDocument, ISymbol, predefinedStates } from '../parser/lexParser';
import {
	createMarkedCodeString,
	getLineAt,
	getWordRangeAtPosition,
} from './utils';

export function doLEXHover(
	document: TextDocument,
	position: Position,
	lexDocument: LexDocument,
): Hover | null {
	const offset = document.offsetAt(position);
	const node = lexDocument.getEmbeddedCode(offset);
	if (node) {
		return null;
	}

	const word = document.getText(
		getWordRangeAtPosition(document, position),
	);
	var symbol: ISymbol =
		lexDocument.defines[word] || lexDocument.states[word];
	if (symbol) {
		const line = getLineAt(
			document,
			document.positionAt(symbol.offset),
		);
		return { contents: createMarkedCodeString(line, 'lex') };
	} else if (predefinedStates[word]) {
		return {
			contents: createMarkedCodeString(
				predefinedStates[word],
				'lex',
			),
		};
	}

	return null;
}
