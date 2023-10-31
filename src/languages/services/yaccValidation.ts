import {
	Diagnostic,
	Range,
	DiagnosticSeverity,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { YACCDocument } from '../parser/yaccParser';
import { ProblemType } from '../common';

export function doYACCValidation(
	document: TextDocument,
	yaccDocument: YACCDocument,
): Diagnostic[] {
	const diags: Diagnostic[] = [];
	yaccDocument.problems.forEach((problem) => {
		const range: Range = {
			start: document.positionAt(problem.offset),
			end: document.positionAt(problem.end),
		};
		let severity: DiagnosticSeverity =
			DiagnosticSeverity.Information;
		switch (problem.type) {
			case ProblemType.Error:
				severity = DiagnosticSeverity.Error;
				break;
			case ProblemType.Information:
				severity = DiagnosticSeverity.Information;
				break;
			case ProblemType.Warning:
				severity = DiagnosticSeverity.Warning;
				break;
		}
		const diag: Diagnostic = {
			range: range,
			message: problem.message,
			severity: severity,
		};
		if (problem.related) {
			const related_range: Range = {
				start: document.positionAt(
					problem.related.offset,
				),
				end: document.positionAt(problem.related.end),
			};
			diag.relatedInformation = [
				{
					location: {
						uri: document.uri,
						range: related_range,
					},
					message: problem.related.message,
				},
			];
		}
		diags.push(diag);
	});
	return diags;
}
