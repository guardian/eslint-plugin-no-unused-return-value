import { ESLintUtils } from '@typescript-eslint/utils';
import {
	AST_NODE_TYPES,
	CallExpression,
	FunctionDeclaration,
	FunctionExpression,
	TSDeclareFunction,
	TSEmptyBodyFunctionExpression,
	ArrowFunctionExpression,
} from '@typescript-eslint/types/dist/generated/ast-spec';
import {
	DefinitionType,
	Reference,
	Scope,
} from '@typescript-eslint/scope-manager';
import {collect} from "./utils/collect";

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://example.com/rule/${name}`,
);

const isFunctionCalled = (ref: Reference): boolean =>
	ref.identifier.type === AST_NODE_TYPES.Identifier &&
	ref.identifier.parent?.type === AST_NODE_TYPES.CallExpression;

const getCallExpression = (ref: Reference): CallExpression | undefined => {
	if (isFunctionCalled(ref)) {
		return ref.identifier.parent as CallExpression;
	}
};

const isReturnValueUsed = (callExpr: CallExpression): boolean => {
	return (
		callExpr.parent?.type === AST_NODE_TYPES.VariableDeclarator ||
		callExpr.parent?.type === AST_NODE_TYPES.ReturnStatement
	);
};

type FunctionNode =
	| FunctionDeclaration
	| FunctionExpression
	| TSDeclareFunction
	| TSEmptyBodyFunctionExpression
	| ArrowFunctionExpression;

const hasNonVoidReturnType = (node: FunctionNode): boolean =>
	// If no returnType is declared then we cannot run this rule
	!!(
		node.returnType &&
		node.returnType.typeAnnotation.type !== AST_NODE_TYPES.TSVoidKeyword
	);

export const rule = createRule({
	create(context) {
		const traverseScope = (scope: Scope): void => {
			scope.childScopes.forEach((childScope) => traverseScope(childScope));

			scope.references.map((ref) => {
				if (ref.resolved) {
					const namedFunctions: FunctionNode[] = collect(ref.resolved.defs, def => {
						if (def.type === DefinitionType.FunctionName) {
							return def.node;
						}
					});

					const arrowFunctions: FunctionNode[] = collect(
						ref.resolved.defs,
						def => {
							if (def.node.type === AST_NODE_TYPES.VariableDeclarator &&
								def.node.init &&
								def.node.init.type === AST_NODE_TYPES.ArrowFunctionExpression) {
								return def.node.init;
							}
						}
					);

					[...namedFunctions, ...arrowFunctions].forEach((functionNode) => {
						const nonVoid = hasNonVoidReturnType(functionNode);
						if (nonVoid) {
							const maybeCallExpression = getCallExpression(ref);
							if (
								maybeCallExpression &&
								!isReturnValueUsed(maybeCallExpression)
							) {
								context.report({
									messageId: 'unused',
									node: ref.identifier,
								});
							}
						}
					});
				}
			});
		};

		return {
			Program(): void {
				const scope = context.getScope();
				traverseScope(scope);
			},
		};
	},
	name: 'no-unused-return-value',
	meta: {
		docs: {
			description: 'Rule to catch unused function return values',
			recommended: 'warn',
		},
		messages: {
			unused: 'Use the return value',
		},
		type: 'suggestion',
		schema: [],
	},
	defaultOptions: [],
});
