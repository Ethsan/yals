import { Position } from 'vscode-languageserver/node';

export interface SemanticTokenData {
	start: Position;
	length: number;
	typeIdx: number;
	modifierSet: number;
}

export const enum SemanticTokenType {
	keyword,
	class,
	enum,
	interface,
	namespace,
	typeParameter,
	type,
	parameter,
	variable,
	property,
	function,
	member,
	_,
}

export const enum SemanticTokenModifier {
	declaration,
	static,
	async,
	readonly,
	_,
}
