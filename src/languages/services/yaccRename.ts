import { Position, WorkspaceEdit, TextEdit } from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { YACCDocument, ISymbol } from '../parser/yaccParser';
import { getWordRangeAtPosition } from './utils';

export function doYACCRename(
	document: TextDocument,
	position: Position,
	newName: string,
	yaccDocument: YACCDocument,
): WorkspaceEdit | null {
	const offset = document.offsetAt(position);
	const node = yaccDocument.getEmbeddedNode(offset);
	if (node) {
		return null;
	}

	const word = document.getText(
		getWordRangeAtPosition(document, position),
	);
	const symbol: ISymbol | undefined =
		yaccDocument.types[word] ||
		yaccDocument.symbols[word] ||
		yaccDocument.tokens[word] ||
		yaccDocument.aliases[`"${word}"`];
	const textEdits: TextEdit[] = [];

	if (symbol && symbol.name.startsWith('"')) newName = `"${newName}"`;
	symbol?.references.forEach((reference) => {
		const range = {
			start: document.positionAt(reference[0]),
			end: document.positionAt(reference[1]),
		};
		textEdits.push(TextEdit.replace(range, newName));
	});
	return { changes: { [document.uri]: textEdits } };
}
