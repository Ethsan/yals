/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	TextDocumentPositionParams,
	Hover,
	HoverParams,
	TextDocumentSyncKind,
	InitializeResult,
	CompletionList,
	DefinitionParams,
	TypeDefinitionParams,
	RenameParams,
	ReferenceParams,
	SemanticTokensParams,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { getLanguageModes } from './modes/languageModes';
import { newSemanticTokenProvider } from './modes/semanticProvider';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

const pendingValidationRequests: { [uri: string]: NodeJS.Timeout } = {};
const validationDelayMs = 500;

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let _hasDiagnosticRelatedInformationCapability = false;

const languageModes = getLanguageModes({ yacc: true, lex: true });
const semanticProvider = newSemanticTokenProvider(languageModes);

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace &&
		!!capabilities.workspace.workspaceFolders
	);
	_hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: false,
				triggerCharacters: [' ', '%', '<', '{'],
			},
			definitionProvider: true,
			typeDefinitionProvider: true,
			referencesProvider: true,
			hoverProvider: true,
			renameProvider: true,
			semanticTokensProvider: {
				legend: {
					tokenTypes: semanticProvider.legend
						.types,
					tokenModifiers:
						semanticProvider.legend
							.modifiers,
				},
				full: true,
			},
		},
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true,
			},
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(
			DidChangeConfigurationNotification.type,
			undefined,
		);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders((_event) => {
			connection.console.log(
				'Workspace folder change event received.',
			);
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration((change) => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample ||
				defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function _getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample',
		});
		result.then((settings) => {
			Object.assign(settings, globalSettings);
			return settings;
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose((e) => {
	cleanPendingValidation(e.document);
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
	triggerValidation(change.document);
});

async function validateTextDocument(document: TextDocument): Promise<void> {
	const mode = languageModes.getMode(document.languageId);
	if (!mode || !mode.doValidation) {
		return;
	}
	const diagnostics = mode.doValidation(document);
	connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

connection.onDidChangeWatchedFiles((_change) => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(
		params: TextDocumentPositionParams,
	): CompletionItem[] | CompletionList | undefined => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		const document = documents.get(params.textDocument.uri);
		if (!document) {
			return;
		}
		const mode = languageModes.getMode(document.languageId);
		if (!mode || !mode.doComplete) {
			return;
		}

		return mode.doComplete(document, params.position);
	},
);

connection.onHover((params: HoverParams): Hover | null => {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return null;
	}
	const mode = languageModes.getMode(document.languageId);
	if (!mode || !mode.doHover) {
		return null;
	}
	return mode.doHover(document, params.position);
});

connection.onDefinition((params: DefinitionParams) => {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return null;
	}
	const mode = languageModes.getMode(document.languageId);
	if (!mode || !mode.findDefinition) {
		return null;
	}
	return mode.findDefinition(document, params.position);
});

connection.onTypeDefinition((params: TypeDefinitionParams) => {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return null;
	}
	const mode = languageModes.getMode(document.languageId);
	if (!mode || !mode.findTypeDefinition) {
		return null;
	}
	return mode.findTypeDefinition(document, params.position);
});

connection.onRenameRequest((params: RenameParams) => {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return null;
	}
	const mode = languageModes.getMode(document.languageId);
	if (!mode || !mode.doRename) {
		return null;
	}
	return mode.doRename(document, params.position, params.newName);
});

connection.onReferences((params: ReferenceParams) => {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return null;
	}
	const mode = languageModes.getMode(document.languageId);
	if (!mode || !mode.findReferences) {
		return null;
	}
	return mode.findReferences(document, params.position);
});

connection.languages.semanticTokens.on((params: SemanticTokensParams) => {
	const document = documents.get(params.textDocument.uri);
	if (!document) {
		return { data: [] };
	}
	return semanticProvider.getSemanticTokens(document);
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

function cleanPendingValidation(textDocument: TextDocument): void {
	const request = pendingValidationRequests[textDocument.uri.toString()];
	if (request) {
		clearTimeout(request);
		delete pendingValidationRequests[textDocument.uri.toString()];
	}
}

function triggerValidation(textDocument: TextDocument): void {
	cleanPendingValidation(textDocument);
	pendingValidationRequests[textDocument.uri.toString()] = setTimeout(
		() => {
			delete pendingValidationRequests[
				textDocument.uri.toString()
			];
			validateTextDocument(textDocument);
		},
		validationDelayMs,
	);
}
