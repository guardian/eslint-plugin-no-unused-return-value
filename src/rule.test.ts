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
        // {
        //     code: `
        //     const foo = (): void => { };
        //     foo();
        //     `,
        //     options: [],
        // }
    ],
    invalid: [
        {
            name: 'Function is called and not assigned',
            code: `
            function foo(): number { return 1; }
            foo();
            `,
            errors: [{ messageId: 'unused' }],
        }
    ],
});
