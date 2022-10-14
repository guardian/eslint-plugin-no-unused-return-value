import { ESLintUtils } from '@typescript-eslint/utils';
import { rule } from './rule';

const ruleTester = new ESLintUtils.RuleTester({
	parser: '@typescript-eslint/parser',
});

/**
 * [ -VariableDeclaration
 *   let [ -VariableDeclarator
 *     f = [ -CallExpression
 *       foo() -Identifier
 *     ]
 *   ]
 * ];
 */

ruleTester.run('rule', rule, {
	valid: [
		{
			name: 'Function not called',
			code: `
            function foo(): number { return 1; }
            `,
			options: [],
		},
		{
			name: 'Function returns void',
			code: `
            function foo(): void { }
            foo();
            `,
			options: [],
		},
		{
			name: 'Function is called and assigned to variable',
			code: `
            function foo(): number { return 1; }
            let f = foo();
            `,
			options: [],
		},
		{
			name: 'Function called and return value returned inline',
			code: `
            function foo(): number { return 1 };
            function bar(): number {
                return foo();
            }
            `,
			options: [],
		},
	],
	invalid: [
		{
			name: 'Function is called and not assigned',
			code: `
            function foo(): number { return 1; }
            foo();
            `,
			errors: [{ messageId: 'unused' }],
		},
		{
			name: 'Function called from another function and return value ignored',
			code: `
            function foo(): number { return 1 };
            function bar(): number {
                foo();
                return 1;
            }
            `,
			errors: [{ messageId: 'unused' }],
		},
	],
});