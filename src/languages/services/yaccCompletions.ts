import {
	CompletionList,
	CompletionItem,
	CompletionItemKind,
	Position,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { YACCDocument, NodeType, predefined } from '../parser/yaccParser';
import { createScanner } from '../parser/yaccScanner';
import { TokenType } from '../yaccLanguageTypes';
import { getWordRangeAtPosition } from './utils';

const keywords = [
	'type',
	'token',
	'option',
	'token-table',
	'left',
	'right',
	'define',
	'output',
	'precedence',
	'nterm',
	'destructor',
	'union',
	'code',
	'printer',
	'defines',
	'start',
	'skeleton',
	'glr-parser',
	'language',
	'parse-param',
	'lex-param',
	'pure-parser',
	'expect',
	'expect-rr',
	'name-prefix',
	'locations',
	'nonassoc',
];

export function doYACCComplete(
	document: TextDocument,
	position: Position,
	yaccDocument: YACCDocument,
): CompletionItem[] | CompletionList {
	const offset = document.offsetAt(position);
	const text = document.getText();
	const embedded = yaccDocument.getEmbeddedNode(offset);
	if (embedded !== undefined) {
		return [];
	}

	const scanner = createScanner(text, offset - 1);
	if (scanner.scan() === TokenType.Percent) {
		if (
			position.character !== 1 ||
			offset >= yaccDocument.rulesRange[0]
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
	// this is used to match the completion items before we feed them out
	// if we return an empty list, VSCode will fall back to the default 'abc' completions, which is what we want

	const node = yaccDocument.getNodeByOffset(offset);
	if (node === undefined) {
		return [];
	}

	const result: CompletionItem[] = [];
	switch (node.nodeType) {
		case NodeType.Token:
		case NodeType.Type:
			if (node.typeOffset && offset > node.typeOffset) {
				if (!node.typeEnd || offset <= node.typeEnd) {
					Object.keys(yaccDocument.types)
						.filter((t) =>
							t
								.toUpperCase()
								.startsWith(
									word,
								),
						)
						.forEach((type) => {
							result.push({
								label: type,
								detail: 'type',
								kind: CompletionItemKind.TypeParameter,
							});
						});
					break;
				}
			}
			if (node.nodeType === NodeType.Type)
				Object.keys(yaccDocument.symbols)
					.filter((t) =>
						t
							.toUpperCase()
							.startsWith(word),
					)
					.forEach((symbol) => {
						result.push({
							label: symbol,
							detail: 'user defined non-terminal',
							kind: CompletionItemKind.Class,
						});
					});
			break;
		case NodeType.Rule:
			Object.keys(yaccDocument.symbols)
				.filter((t) => t.toUpperCase().startsWith(word))
				.forEach((symbol) => {
					result.push({
						label: symbol,
						detail: 'user defined non-terminal',
						kind: CompletionItemKind.Class,
					});
				});
			Object.keys(yaccDocument.tokens)
				.filter((t) => t.toUpperCase().startsWith(word))
				.forEach((token) => {
					result.push({
						label: token,
						detail: 'user defined token',
						kind: CompletionItemKind.Field,
					});
				});
			Object.keys(predefined)
				.filter((t) => t.toUpperCase().startsWith(word))
				.forEach((key) => {
					result.push({
						label: key,
						detail: 'predefined symbol',
						kind: CompletionItemKind.Method,
					});
				});
			break;
		default:
			break;
	}
	return result;
}
