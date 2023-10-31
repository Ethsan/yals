import { Position, Location, Range } from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { LexDocument, ISymbol } from '../parser/lexParser';
import { getWordRangeAtPosition } from './utils';

export function doLEXFindReferences(
	document: TextDocument,
	position: Position,
	lexDocument: LexDocument,
): Location[] {
	const offset = document.offsetAt(position);
	const node = lexDocument.getEmbeddedCode(offset);
	if (node) {
		return [];
	}

	const word = document.getText(
		getWordRangeAtPosition(document, position),
	);
	var symbol: ISymbol | undefined =
		lexDocument.defines[word] || lexDocument.states[word];
	let location: Location[] = [];
	symbol?.references.forEach((reference) => {
		location.push({
			uri: document.uri,
			range: {
				start: document.positionAt(reference[0]),
				end: document.positionAt(reference[1]),
			},
		});
	});
	return location;
}
