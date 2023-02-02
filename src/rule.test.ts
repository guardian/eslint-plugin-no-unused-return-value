import { ESLintUtils } from '@typescript-eslint/utils';
import { rule } from './rule';

const ruleTester = new ESLintUtils.RuleTester({
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaFeatures: {
			jsx: true,
		},
	}
});

/**
 * let f = foo();
 *
 * Becomes -
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
			name: 'Function is called in an expression, the result of which is assigned to variable',
			code: `
			function foo(): number { return 1 };
		    let f = 1 + foo()
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
		{
			name: 'Arrow function assigned to a const, then called, with return value assigned to a variable',
			code: `
            const foo = (): number => { return 1 };
            let f = foo()
            `,
			options: [],
		},
		{
			name: 'Function assigned to a const, then called, with return value assigned to a variable',
			code: `
			const foo = function(): number { return 1 }
            let f = foo()
            `,
			options: [],
		},
		{
			name: 'Function receives a function, calls it, and returns the result',
			code: `
			function foo(f: () => number): number {
			  return f()
			}
            `,
			options: [],
		},
		{
			name: 'FunctionA passed to FunctionB, and result of FunctionB is used',
			code: `
			const double = (n: number): number => n*2;
			const apply = (n: number, f: (n: number) => number): number => f(n);
			const result = apply(2, double); 
			`,
		},
		{
			name: 'Async function is awaited and result assigned to variable',
			code: `
			const foo = (): Promise<number> => Promise.resolve(1);
			let f = await foo()
		    `,
			options: [],
		},
		{
			name: 'String interpolation with function call',
			code: `
			const foo = (): string => 'blah';
			let f = \`bleh \${foo()} bleh\`
		    `,
			options: [],
		},
		{
			name: 'String concatenation with function call',
			code: `
			const foo = (): string => 'blah';
			let f = 'bleh' + foo() + 'bleh'
		    `,
			options: [],
		},
		{
			name: 'Inline function used as object property value',
			code: `
			const foo = (): string => 'blah';
			const bar = {
				baz: foo(),
			};
			`,
			options: [],
		},
		{
			name: 'Return value of function used for JSX prop',
			code: `
			const Foo = ({ foo }) => {
					return <div>{foo}</div>;
			};
			const bar = (): string => 'bar';

			<Foo foo={bar()} />
			`,
			options: [],
		},
		{
			name: 'Result of Promise.then method call is used',
			code: `
			function foo(f: Promise<number>): Promise<void> {
			    return f.then(n => n*2);
			}
			`,
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
		{
			name: 'Arrow function assigned to a const, then called and return value ignored',
			code: `
            const foo = (): number => { return 1 };
            foo()
            `,
			errors: [{ messageId: 'unused' }],
		},
		{
			name: 'Function assigned to a const, then called and return value ignored',
			code: `
			const foo = function(): number { return 1 }
            foo()
            `,
			errors: [{ messageId: 'unused' }],
		},
		{
			name: 'Function receives a function, calls it, but ignores the return value',
			code: `
			function foo(f: () => number): void {
			  f()
			}
            `,
			errors: [{ messageId: 'unused' }],
		},
		{
			name: 'Async function is awaited and return value ignored',
			code: `
			const foo = (): Promise<number> => Promise.resolve(1);
			await foo()
		    `,
			errors: [{ messageId: 'unused' }],
		},
		{
			name: 'Result of Promise.then method call is not used',
			code: `
			function foo(f: Promise<number>) {
			  f.then(n => n*2);
			}
			`,
			errors: [{ messageId: 'unusedPromiseMethod' }],
		},
		{
			name: 'FunctionA passed to FunctionB, and result of FunctionB is not used',
			code: `
			const double = (n: number): number => n*2;
			const apply = (n: number, f: (n: number) => number): number => f(n);
			apply(2, double); 
			`,
			errors: [{ messageId: 'unused' }],
		},
	],
});
