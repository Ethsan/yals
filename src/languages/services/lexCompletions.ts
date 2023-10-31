import {
	CompletionList,
	CompletionItem,
	CompletionItemKind,
	Position,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { LexDocument } from '../parser/lexParser';
import { createScanner } from '../parser/lexScanner';
import { TokenType } from '../lexLanguageTypes';
import { getWordRangeAtPosition, getLineAt } from './utils';

const keywords = ['array', 'pointer', 'option', 's', 'x'];

export function doLEXCompletion(
	document: TextDocument,
	position: Position,
	lexDocument: LexDocument,
): CompletionItem[] | CompletionList {
	const offset = document.offsetAt(position);
	const text = document.getText();
	const embedded = lexDocument.getEmbeddedCode(offset);
	if (embedded !== undefined) {
		return [];
	}

	const scanner = createScanner(text, offset - 1);
	if (scanner.scan() === TokenType.Percent) {
		if (
			position.character !== 1 ||
			offset >= lexDocument.rulesRange[0]
		)
			return [];

		return keywords.map((keyword) => {
			return {
				label: keyword,
				detail: 'keyword',
				kind: CompletionItemKind.Constructor,
			};
		});
	}

	const word = document
		.getText(getWordRangeAtPosition(document, position))
		.toUpperCase();

	const line = getLineAt(document, position).substring(
		0,
		position.character,
	);

	const result: CompletionItem[] = [];
	if (offset < lexDocument.rulesRange[0]) {
		// if before rules zone, definition need to be on the right
		const ok = line.match(/^\w+.*({\w*}?)+/);
		if (!ok) {
			return result;
		}
		Object.keys(lexDocument.defines)
			.filter((t) => t.toUpperCase().startsWith(word))
			.forEach((key) => {
				result.push({
					label: key,
					detail: 'definition',
					kind: CompletionItemKind.Class,
				});
			});
	} else if (offset < lexDocument.rulesRange[1]) {
		const res = line.match(/^[^\s]*(?:{\w*}?)+$/);
		if (res) {
			if (res[0].length >= position.character) {
				Object.keys(lexDocument.defines)
					.filter((t) =>
						t
							.toUpperCase()
							.startsWith(word),
					)
					.forEach((key) => {
						result.push({
							label: key,
							detail: 'definition',
							kind: CompletionItemKind.Class,
						});
					});
			}
		} else {
			if (line.match(/^<[\w,]*>[^\s]*(?:{\w*}?)+$/)) {
				Object.keys(lexDocument.defines)
					.filter((t) =>
						t
							.toUpperCase()
							.startsWith(word),
					)
					.forEach((key) => {
						result.push({
							label: key,
							detail: 'definition',
							kind: CompletionItemKind.Class,
						});
					});
			} else if (line.match(/^<[\w,]*$/)) {
				// TODO: fix completion for {} after <>
				Object.keys(lexDocument.states)
					.filter((t) =>
						t
							.toUpperCase()
							.startsWith(word),
					)
					.forEach((key) => {
						result.push({
							label: key,
							detail: 'initial state',
							kind: CompletionItemKind.Class,
						});
					});
			}
		}
	}
	return result;
}
