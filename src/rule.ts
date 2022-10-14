import { ESLintUtils } from '@typescript-eslint/utils';
import {AST_NODE_TYPES, CallExpression, FunctionDeclaration, FunctionExpression, TSDeclareFunction, TSEmptyBodyFunctionExpression} from "@typescript-eslint/types/dist/generated/ast-spec";
import { DefinitionType, FunctionNameDefinition, Reference } from '@typescript-eslint/scope-manager';
import {TSESTree} from "@typescript-eslint/types";

const createRule = ESLintUtils.RuleCreator(
    name => `https://example.com/rule/${name}`,
);

const isFunctionCalled = (ref: Reference): boolean =>
    ref.identifier.type === AST_NODE_TYPES.Identifier && ref.identifier.parent.type === AST_NODE_TYPES.CallExpression;

const getCallExpression = (ref: Reference): CallExpression | undefined => {
    if (isFunctionCalled(ref)) {
        return ref.identifier.parent as CallExpression;
    }
}

const isReturnValueUsed = (callExpr: CallExpression): boolean => {
    return callExpr.parent.type === AST_NODE_TYPES.VariableDeclarator;
}

const hasNonVoidReturnType = (node: FunctionDeclaration | FunctionExpression | TSDeclareFunction | TSEmptyBodyFunctionExpression): boolean =>
    // If no returnType is declared then we cannot run this rule
    node.returnType && node.returnType.typeAnnotation.type !== AST_NODE_TYPES.TSVoidKeyword;

export const rule = createRule({
    create(context) {
        return {
            Program(): void {
                const scope = context.getScope();
                scope.references.map(ref => {
                    // TODO - why is defs an array?
                    const functions = ref.resolved.defs.filter(def => def.type === DefinitionType.FunctionName) as FunctionNameDefinition[];
                    functions.forEach(fun => {
                        const nonVoid = hasNonVoidReturnType(fun.node);
                        if (nonVoid) {
                            const maybeCallExpression = getCallExpression(ref);
                            if (maybeCallExpression && !isReturnValueUsed(maybeCallExpression)) {
                                context.report({
                                    messageId: 'unused',
                                    node: ref.identifier,
                                });
                            }
                        }
                    })
                })
            },
            // CallExpression(node: CallExpression) {
            //     console.log(node.callee)
            // },
            // FunctionDeclaration(node: FunctionDeclaration) {
            //     if (hasNonVoidReturnType(node)) {
            //         node.
            //         context.report({
            //             messageId: 'unused',
            //             node: node.id,
            //         });
            //     }
            // },
        };
    },
    name: 'no-unused-return-value',
    meta: {
        docs: {
            description:
                'Rule to catch unused function return values',
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
