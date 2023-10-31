import { MarkupContent } from 'vscode-languageserver';
import {
	TextDocument,
	Position,
	Range,
} from 'vscode-languageserver-textdocument';

export function createMarkedCodeString(
	code: string,
	languageId: string,
): MarkupContent {
	return {
		kind: 'markdown',
		value: `\`\`\`${languageId}\n${code}\n\`\`\``,
	};
}

export function getLineAt(document: TextDocument, position: Position): string {
	return document.getText({
		start: { line: position.line, character: 0 },
		end: { line: position.line + 1, character: 0 }, /// need testing
	});
}

export function getWordRangeAtPosition(
	document: TextDocument,
	position: Position,
	regExp?: RegExp,
): Range | undefined {
	if (!regExp) {
		regExp = RegExp('[A-Za-z_][A-Za-z0-9_]*');
	} else if (regExpLeadsToEndlessLoop(regExp)) {
		throw new Error(`RegExp ${regExp} results in endless loop.`);
	}

	const WordAtText = getWordAtText(
		getLineAt(document, position),
		position.character,
		regExp,
	);
	if (WordAtText) {
		return {
			start: {
				line: position.line,
				character: WordAtText.start,
			},
			end: {
				line: position.line,
				character: WordAtText.start + WordAtText.length,
			},
		};
	}
	return undefined;
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export function getWordAtText(
	text: string,
	offset: number,
	wordDefinition: RegExp,
): { start: number; length: number } {
	let lineStart = offset;
	while (
		lineStart > 0 &&
		!isNewlineCharacter(text.charCodeAt(lineStart - 1))
	) {
		lineStart--;
	}
	const offsetInLine = offset - lineStart;
	const lineText = text.substring(lineStart);

	// make a copy of the regex as to not keep the state
	const flags = wordDefinition.ignoreCase ? 'gi' : 'g';
	wordDefinition = new RegExp(wordDefinition.source, flags);

	let match = wordDefinition.exec(lineText);
	while (match && match.index + match[0].length < offsetInLine) {
		match = wordDefinition.exec(lineText);
	}
	if (match && match.index <= offsetInLine) {
		return {
			start: match.index + lineStart,
			length: match[0].length,
		};
	}

	return { start: offset, length: 0 };
}

export function regExpLeadsToEndlessLoop(regexp: RegExp): boolean {
	// Exit early if it's one of these special cases which are meant to match
	// against an empty string
	if (
		regexp.source === '^' ||
		regexp.source === '^$' ||
		regexp.source === '$' ||
		regexp.source === '^\\s*$'
	) {
		return false;
	}

	// We check against an empty string. If the regular expression doesn't advance
	// (e.g. ends in an endless loop) it will match an empty string.
	const match = regexp.exec('');
	return !!(match && regexp.lastIndex === 0);
}

const CR = '\r'.charCodeAt(0);
const NL = '\n'.charCodeAt(0);
export function isNewlineCharacter(charCode: number) {
	return charCode === CR || charCode === NL;
}
