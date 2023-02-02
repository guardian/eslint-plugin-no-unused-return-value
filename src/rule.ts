import {AST_NODE_TYPES, ESLintUtils} from '@typescript-eslint/utils';
import {
	ArrowFunctionExpression,
	CallExpression,
	FunctionDeclaration,
	FunctionExpression,
	MemberExpression,
	Node,
	TSDeclareFunction,
	TSEmptyBodyFunctionExpression,
} from '@typescript-eslint/types/dist/generated/ast-spec';
import {Definition, DefinitionType, Reference, Scope} from '@typescript-eslint/scope-manager';
import {collect} from "./utils/collect";

const createRule = ESLintUtils.RuleCreator(
	(name) => `https://example.com/rule/${name}`,
);

const isFunctionCalled = (ref: Reference): boolean => {
	const parent = ref.identifier.parent as CallExpression;
	return parent.callee === ref.identifier &&
		ref.identifier.parent?.type === AST_NODE_TYPES.CallExpression;
}

const validUsageNodeTypes: AST_NODE_TYPES[] = [
	AST_NODE_TYPES.VariableDeclarator,
	AST_NODE_TYPES.ReturnStatement,
	AST_NODE_TYPES.BinaryExpression,
	AST_NODE_TYPES.TemplateLiteral,
	AST_NODE_TYPES.ArrowFunctionExpression,
	AST_NODE_TYPES.JSXExpressionContainer,
	AST_NODE_TYPES.Property,	// property assignment
];
const isValidUsageNodeType = (type: AST_NODE_TYPES | undefined) => !!type && validUsageNodeTypes.includes(type);
const isReturnValueUsed = (callExpr: CallExpression): boolean =>
	isValidUsageNodeType(callExpr.parent?.type) ||
	(callExpr.parent?.type === AST_NODE_TYPES.AwaitExpression && isValidUsageNodeType(callExpr.parent?.parent?.type));

type FunctionNode =
	| FunctionDeclaration
	| FunctionExpression
	| TSDeclareFunction
	| TSEmptyBodyFunctionExpression
	| ArrowFunctionExpression;
const functionNodeTypes = [AST_NODE_TYPES.FunctionDeclaration, AST_NODE_TYPES.FunctionExpression, AST_NODE_TYPES.TSDeclareFunction, AST_NODE_TYPES.TSEmptyBodyFunctionExpression, AST_NODE_TYPES.TSEmptyBodyFunctionExpression, AST_NODE_TYPES.ArrowFunctionExpression, AST_NODE_TYPES.TSFunctionType];
const isFunctionNode = (node: Node): node is FunctionNode =>
	functionNodeTypes.includes(node.type);

// Look for a function passed as a parameter, e.g. function foo(param: () => number)
const checkForParameterWhichIsAFunction = (def: Definition): FunctionNode | undefined => {
	if (def.type === DefinitionType.Parameter) {
		const name = def.name;
		if (name?.typeAnnotation) {
			// This seems to be the only way to get info about the parameter if it's a function
			if (isFunctionNode(name.typeAnnotation.typeAnnotation)) {
				return name.typeAnnotation.typeAnnotation;
			}
		}
	}
}

// Look for a function assigned to a variable, e.g. const f = (): number => { return 1 };
const checkForVariableWithFunction = (def: Definition): FunctionNode | undefined => {
	if (def.node.type === AST_NODE_TYPES.VariableDeclarator &&
		def.node.init &&
		isFunctionNode(def.node.init)) {
		return def.node.init;
	}
}

const hasNonVoidReturnType = (node: FunctionNode): boolean =>
	// If no returnType is declared then we cannot run this rule
	!!(
		node.returnType &&
		node.returnType.typeAnnotation.type !== AST_NODE_TYPES.TSVoidKeyword
	);

const isMemberExpressionNode = (node: Node): node is MemberExpression =>
	node.type === AST_NODE_TYPES.MemberExpression;
const isCallExpressionNode = (node: Node): node is CallExpression =>
	node.type === AST_NODE_TYPES.CallExpression;

// If ref is an identifier for an object and one of methodNames is being called then return the CallExpression
const getCallExpressionForNamedMethod = (ref: Reference, methodNames: string[]): CallExpression | undefined => {
	if (ref.identifier.type === AST_NODE_TYPES.Identifier && ref.identifier.parent) {
		const parent = ref.identifier.parent;
		if (isMemberExpressionNode(parent) && parent.parent && isCallExpressionNode(parent.parent)) {
			if (parent.property.type === AST_NODE_TYPES.Identifier) {
				if (methodNames.includes(parent.property.name)) {
					return parent.parent;
				}
			}
		}
	}
}

// If ref is a function and is being called then return the CallExpression
const getCallExpressionForFunction = (ref: Reference): CallExpression | undefined => {
	if (isFunctionReference(ref) && isFunctionCalled(ref)) {
		return ref.identifier.parent as CallExpression;
	}
};

const isFunctionReference = (ref: Reference): boolean => {
	if (ref.resolved) {
		const functionNodes: FunctionNode[] = collect(ref.resolved.defs, def => {
			const functionParameter = checkForParameterWhichIsAFunction(def);
			if (functionParameter) {
				return functionParameter
			}

			const variable = checkForVariableWithFunction(def);
			if (variable) {
				return variable;
			}

			if (isFunctionNode(def.node)) {
				return def.node;
			}
		});

		const nonVoidReturnFunctions = functionNodes.filter(
			functionNode => hasNonVoidReturnType(functionNode)
		);

		// We'd only expect nonVoidReturnFunctions to have 0 or 1 elements at this point
		return nonVoidReturnFunctions.length > 0;
	}
	return false;
}

export const rule = createRule({
	create(context) {
		const traverseScope = (scope: Scope): void => {
			scope.childScopes.forEach((childScope) => traverseScope(childScope));

			scope.references.map((ref) => {

				// Hardcode the handling of Promise.then + Promise.catch - it should always expect the value to be used.
				// For other method calls, we cannot know the return type of the method without finding the class def - so this is unsupported for now.
				const methodCallExpression = getCallExpressionForNamedMethod(ref, ['then', 'catch']);
				if (methodCallExpression && !isReturnValueUsed(methodCallExpression)) {
					context.report({
						messageId: 'unusedPromiseMethod',
						node: ref.identifier,
					});
				} else {
					const functionCallExpression = getCallExpressionForFunction(ref);
					if (
						functionCallExpression &&
						!isReturnValueUsed(functionCallExpression)
					) {
						context.report({
							messageId: 'unused',
							node: ref.identifier,
						});
					}
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
			unusedPromiseMethod: 'Use the returned Promise'
		},
		type: 'suggestion',
		schema: [],
	},
	defaultOptions: [],
});
