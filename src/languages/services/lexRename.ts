import { Position, WorkspaceEdit, TextEdit } from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { LexDocument, ISymbol } from '../parser/lexParser';
import { getWordRangeAtPosition } from './utils';

export function doLEXRename(
	document: TextDocument,
	position: Position,
	newName: string,
	lexDocument: LexDocument,
): WorkspaceEdit | null {
	const offset = document.offsetAt(position);
	const node = lexDocument.getEmbeddedCode(offset);
	if (node) {
		return null;
	}

	const word = document.getText(
		getWordRangeAtPosition(document, position),
	);
	const symbol: ISymbol | undefined =
		lexDocument.defines[word] || lexDocument.states[word];
	const textEdits: TextEdit[] = [];
	symbol?.references.forEach((reference) => {
		const range = {
			start: document.positionAt(reference[0]),
			end: document.positionAt(reference[1]),
		};
		textEdits.push(TextEdit.replace(range, newName));
	});
	return { changes: { [document.uri]: textEdits } };
}
