// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025 Ala-eddine KADDOURI

//!!!Warning!!! this code is not clean, it was initially written as a PoC then used as transpiler for PineTS
//Future version will require major refactoring or full rewrite of the transpiler
/**
 * PineTS Transpiler
 *
 * What is PineTS ?
 * -----------------
 * PineTS is an open-source intermediate language designed to bridge the gap between Pine Script and JavaScript.
 * It provides a way to simulate Pine Script-like behavior in a JavaScript environment by representing Pine Script code
 * in a JavaScript-compatible format.
 *
 * Important Notes:
 * -----------------
 * 1. **Independence from Pine Script**: PineTS is not officially affiliated with, endorsed by, or associated with TradingView or Pine Script.
 *    It is an independent open-source initiative created to enable developers to replicate Pine Script indicators in JavaScript environments.
 * 2. **Purpose**: PineTS uses JavaScript syntax and semantics but should not be confused with standard JavaScript code.
 *    It acts as a representation of Pine Script logic that requires transpilation to be executed in JavaScript.
 * 3. **Open Source**: This project is developed and maintained as an open-source initiative. It is intended to serve as a tool for
 *    developers to bridge Pine Script concepts into JavaScript applications.
 *
 * What Does PineTS Transpiler Do?
 * --------------------------------
 * PineTS cannot be executed directly in a JavaScript environment. It requires transpilation into standard JavaScript to handle
 * Pine Script's unique time-series data processing. The PineTS Transpiler facilitates this process by transforming PineTS code
 * into executable JavaScript at runtime, making it possible to execute Pine Script-inspired logic in JavaScript applications.
 *
 * Key Features of the Transpiler:
 * --------------------------------
 * 1. **Context Management**: Transforms code to use a context object (`$`) for variable storage, ensuring all variables are
 *    accessed through this context to prevent scope conflicts.
 * 2. **Variable Scoping**: Renames variables based on their scope and declaration type (`const`, `let`, `var`) to avoid naming issues.
 * 3. **Function Handling**: Converts arrow functions while maintaining parameters and logic. Parameters are registered in the context
 *    to prevent accidental renaming.
 * 4. **Loop and Conditional Handling**: Adjusts loops and conditionals to ensure proper scoping and handling of variables.
 *
 * Usage:
 * -------
 * - The `transpile` function takes a JavaScript function or code string, applies transformations, and returns the transformed
 *   code or function.
 * - The transformed code uses a context object (`$`) to manage variable storage and access.
 *
 * Disclaimer:
 * -----------
 * PineTS is independently developed and is not endorsed by or affiliated with TradingView, the creators of Pine Script. All
 * trademarks and registered trademarks mentioned belong to their respective owners.
 */

import {
    Parser,
    type ArrayExpression,
    type ArrayPattern,
    type ArrowFunctionExpression,
    type AssignmentExpression,
    type BinaryExpression,
    type BlockStatement,
    type CallExpression,
    type ConditionalExpression,
    type Expression,
    type ExpressionStatement,
    type ForStatement,
    type FunctionDeclaration,
    type Identifier,
    type IfStatement,
    type Literal,
    type LogicalExpression,
    type MemberExpression,
    type Node,
    type ObjectExpression,
    type Pattern,
    type PrivateIdentifier,
    type Program,
    type Property,
    type ReturnStatement,
    type SpreadElement,
    type UnaryExpression,
    type VariableDeclaration,
    type WhileStatement
} from 'acorn';
import * as walk from 'acorn-walk';
import { tsPlugin } from '@sveltejs/acorn-typescript';
import * as astring from 'astring';
import ScopeManager from './ScopeManager.class';
const CONTEXT_NAME = '$';
const UNDEFINED_ARG = {
    type: 'Identifier',
    name: 'undefined',
} as Identifier;


interface More extends Node {
    _transformed?: boolean,
    _isParamCall?: boolean,
    _indexTransformed?: boolean,
    _arrayAccessed?: boolean,
    parent?: Node,
}

function isObject(value: unknown): value is object {
    return typeof value === 'object' && value !== undefined && value !== null;
}

function isVariableDeclaration(node: Node): node is VariableDeclaration { return node.type === 'VariableDeclaration' }
function isIdentifier(node: Node): node is Identifier { return node.type === 'Identifier' }
function isMemberExpression(node: Node): node is MemberExpression { return node.type === 'MemberExpression' }
function isCallExpression(node: Node): node is CallExpression { return node.type === 'CallExpression' }
function isArrowFunctionExpression(node: Node): node is ArrowFunctionExpression { return node.type === 'ArrowFunctionExpression' }
function isBinaryExpression(node: Node): node is BinaryExpression { return node.type === 'BinaryExpression' }
function isConditionalExpression(node: Node): node is ConditionalExpression { return node.type === 'ConditionalExpression' }
function isLiteral(node: Node): node is Literal { return node.type === 'Literal' }
function isArrayExpression(node: Node): node is ArrayExpression { return node.type === 'ArrayExpression' }
function isAssignmentExpression(node: Node): node is AssignmentExpression { return node.type === 'AssignmentExpression' }
function isObjectExpression(node: Node): node is ObjectExpression { return node.type === 'ObjectExpression' }
function isLogicalExpression(node: Node): node is LogicalExpression { return node.type === 'LogicalExpression' }
function isBlockStatement(node: Node): node is BlockStatement { return node.type === 'BlockStatement' }
function isArrayPattern(node: Node): node is ArrayPattern { return node.type === 'ArrayPattern' }

function transformArrayIndex(node: MemberExpression, scopeManager: ScopeManager): void {
    //const isIfStatement = scopeManager.getCurrentScopeType() == 'if';
    //const isForStatement = scopeManager.getCurrentScopeType() == 'for';
    if (node.computed && isIdentifier(node.property)) {
        // Skip transformation if it's a loop variable
        if (scopeManager.isLoopVariable(node.property.name)) {
            return;
        }

        // Only transform if it's not a context-bound variable
        if (!scopeManager.isContextBound(node.property.name)) {
            const [scopedName, kind] = scopeManager.getVariable(node.property.name);
            node.property = {
                type: 'MemberExpression',
                object: {
                    type: 'MemberExpression',
                    object: {
                        type: 'Identifier',
                        name: CONTEXT_NAME,
                    } as Identifier,
                    property: {
                        type: 'Identifier',
                        name: kind,
                    } as Identifier,
                    computed: false,
                } as MemberExpression,
                property: {
                    type: 'Identifier',
                    name: scopedName,
                } as Identifier,
                computed: false,
            } as MemberExpression;

            // Add [0] to the index
            node.property = {
                type: 'MemberExpression',
                object: node.property,
                property: {
                    type: 'Literal',
                    value: 0,
                } as Literal,
                computed: true,
            } as MemberExpression;
        }
    }

    if (node.computed && isIdentifier(node.object)) {
        if (scopeManager.isLoopVariable(node.object.name)) {
            return;
        }

        if (!scopeManager.isContextBound(node.object.name)) {
            const [scopedName, kind] = scopeManager.getVariable(node.object.name);

            //transform the object to scoped variable

            node.object = {
                type: 'MemberExpression',
                object: {
                    type: 'MemberExpression',
                    object: {
                        type: 'Identifier',
                        name: CONTEXT_NAME,
                    } as Identifier,
                    property: {
                        type: 'Identifier',
                        name: kind,
                    } as Identifier,
                    computed: false,
                },
                property: {
                    type: 'Identifier',
                    name: scopedName,
                } as Identifier,
                computed: false,
            } as MemberExpression;
        }

        if (isMemberExpression(node.property)) {
            const memberNode = node.property;
            if (!(memberNode as More)._indexTransformed) {
                transformArrayIndex(memberNode, scopeManager);
                (memberNode as More)._indexTransformed = true;
            }
        }
    }
}

function transformMemberExpression(memberNode: MemberExpression, originalParamName: string, scopeManager: ScopeManager): void {
    // Skip transformation for Math object properties
    if (memberNode.object && isIdentifier(memberNode.object) && memberNode.object.name === 'Math') {
        return;
    }

    //if statment variables always need to be transformed
    const isIfStatement = scopeManager.getCurrentScopeType() == 'if';
    const isElseStatement = scopeManager.getCurrentScopeType() == 'els';
    const isForStatement = scopeManager.getCurrentScopeType() == 'for';
    // If the object is a context-bound variable (like a function parameter), skip transformation
    if (
        !isIfStatement &&
        !isElseStatement &&
        !isForStatement &&
        memberNode.object &&
        isIdentifier(memberNode.object) &&
        scopeManager.isContextBound(memberNode.object.name) &&
        !scopeManager.isRootParam(memberNode.object.name)
    ) {
        return;
    }

    // Transform array indices
    if (!(memberNode as More)._indexTransformed) {
        transformArrayIndex(memberNode, scopeManager);
        (memberNode as More)._indexTransformed = true;
    }
}

function transformVariableDeclaration(varNode: VariableDeclaration, scopeManager: ScopeManager): void {
    varNode.declarations.forEach((decl) => {
        //special case for na
        if ('name' in decl.init && decl.init.name == 'na') {
            decl.init.name = 'NaN';
        }

        // Check if this is a context property assignment

        // prettier-ignore
        const isContextProperty =
            decl.init &&
            isMemberExpression(decl.init) &&
            decl.init.object &&
            ('name' in decl.init.object && (
                decl.init.object.name === 'context' ||
                decl.init.object.name === CONTEXT_NAME ||
                decl.init.object.name === 'context2'))

        // prettier-ignore
        const isSubContextProperty =
            decl.init &&
            isMemberExpression(decl.init) &&
            decl.init.object &&
            'object' in decl.init.object && decl.init.object.object &&
            ('name' in decl.init.object.object && (
                decl.init.object.object.name === 'context' ||
                decl.init.object.object.name === CONTEXT_NAME ||
                decl.init.object.object.name === 'context2'));

        // Check if this is an arrow function declaration
        const isArrowFunction = decl.init && isArrowFunctionExpression(decl.init);

        if (isContextProperty) {
            // For context properties, register as context-bound and update the object name
            if ('name' in decl.id && decl.id.name) {
                scopeManager.addContextBoundVar(decl.id.name);
            }
            if ('properties' in decl.id && decl.id.properties) {
                decl.id.properties.forEach((property) => {
                    if ('key' in property && 'name' in property.key && property.key.name) {
                        scopeManager.addContextBoundVar(property.key.name);
                    }
                });
            }
            ((decl.init as MemberExpression).object as { name: string }).name = CONTEXT_NAME;
            return;
        }

        if (isSubContextProperty) {
            // For context properties, register as context-bound and update the object name
            if ('name' in decl.id && decl.id.name) {
                scopeManager.addContextBoundVar(decl.id.name);
            }
            if ('properties' in decl.id && decl.id.properties) {
                decl.id.properties.forEach((property) => {
                    if ('key' in property && 'name' in property.key && property.key.name) {
                        scopeManager.addContextBoundVar(property.key.name);
                    }
                });
            }
            ((decl.init as MemberExpression).object as { name: string }).name = CONTEXT_NAME;
            return;
        }

        if (isArrowFunction) {
            // Register arrow function parameters as context-bound
            (decl.init as ArrowFunctionExpression).params.forEach((param) => {
                if (isIdentifier(param)) {
                    scopeManager.addContextBoundVar(param.name);
                }
            });
        }

        // Transform non-context variables to use the context object
        const newName = scopeManager.addVariable((decl.id as { name: string }).name, varNode.kind);
        const kind = varNode.kind; // 'const', 'let', or 'var'

        // Transform identifiers in the init expression
        if (decl.init && !isArrowFunction) {
            // Check if initialization is a namespace function call
            if (
                isCallExpression(decl.init) &&
                isMemberExpression(decl.init.callee) &&
                decl.init.callee.object &&
                isIdentifier(decl.init.callee.object) &&
                scopeManager.isContextBound(decl.init.callee.object.name)
            ) {
                // Transform the function call arguments
                transformCallExpression(decl.init, scopeManager);
            } else {
                // Add parent references for proper function call detection
                walk.recursive(
                    decl.init,
                    { parent: decl.init },
                    {
                        Identifier(node, state) {
                            (node as More).parent = state.parent;
                            transformIdentifier(node, scopeManager);

                            const isBinaryOperation = (node as More).parent && isBinaryExpression((node as More).parent);
                            const isConditional = (node as More).parent && isConditionalExpression((node as More).parent);
                            if (isIdentifier(node) && (isBinaryOperation || isConditional)) {
                                Object.assign(node, {
                                    type: 'MemberExpression',
                                    object: {
                                        type: 'Identifier',
                                        name: node.name,
                                    },
                                    property: {
                                        type: 'Literal',
                                        value: 0,
                                    },
                                    computed: true,
                                });
                            }
                        },
                        CallExpression(node, state, c) {
                            // Set parent for the function name
                            if (isIdentifier(node.callee)) {
                                (node.callee as More).parent = node;
                            }
                            // Set parent for arguments
                            node.arguments.forEach((arg) => {
                                if (isIdentifier(arg)) {
                                    (arg as More).parent = node;
                                }
                            });
                            transformCallExpression(node, scopeManager);
                            // Continue walking the arguments
                            node.arguments.forEach((arg) => c(arg, { parent: node }));
                        },
                        BinaryExpression(node, state, c) {
                            // Set parent references for operands
                            if (isIdentifier(node.left)) {
                                (node.left as More).parent = node;
                            }
                            if (isIdentifier(node.right)) {
                                (node.right as More).parent = node;
                            }
                            // Transform both operands
                            c(node.left, { parent: node });
                            c(node.right, { parent: node });
                        },
                        MemberExpression(node, state, c) {
                            // Set parent reference
                            if (isIdentifier(node.object)) {
                                (node.object as More).parent = node;
                            }
                            if (isIdentifier(node.property)) {
                                (node.property as More).parent = node;
                            }
                            // Transform array indices first
                            transformArrayIndex(node, scopeManager);
                            // Then continue with object transformation
                            if (node.object) {
                                c(node.object, { parent: node });
                            }
                        },
                    }
                );
            }
        }

        // Create the target variable reference
        const targetVarRef = {
            type: 'MemberExpression',
            object: {
                type: 'MemberExpression',
                object: {
                    type: 'Identifier',
                    name: CONTEXT_NAME,
                },
                property: {
                    type: 'Identifier',
                    name: kind,
                },
                computed: false,
            },
            property: {
                type: 'Identifier',
                name: newName,
            },
            computed: false,
        } as MemberExpression;

        const isArrayPatternVar = scopeManager.isArrayPatternElement((decl.id as { name: string }).name);
        // Check if initialization is from array access
        const isArrayInit =
            !isArrayPatternVar &&
            decl.init &&
            isMemberExpression(decl.init) &&
            decl.init.computed &&
            decl.init.property &&
            (isLiteral(decl.init.property) || isMemberExpression(decl.init.property));

        if (decl.init && 'property' in decl.init && decl.init.property && isMemberExpression(decl.init.property)) {
            if (!(decl.init.property as More)._indexTransformed) {
                transformArrayIndex(decl.init.property, scopeManager);
                (decl.init.property as More)._indexTransformed = true;
            }
        }
        // Create an assignment expression for the transformed variable
        const assignmentExpr = {
            type: 'ExpressionStatement',
            expression: {
                type: 'AssignmentExpression',
                operator: '=',
                left: targetVarRef,
                right: decl.init
                    ? isArrowFunction || isArrayPatternVar
                        ? decl.init // Keep arrow functions and array pattern variables as-is
                        : {
                            type: 'CallExpression',
                            callee: {
                                type: 'MemberExpression',
                                object: {
                                    type: 'Identifier',
                                    name: CONTEXT_NAME,
                                },
                                property: {
                                    type: 'Identifier',
                                    name: 'init',
                                },
                                computed: false,
                            },
                            arguments: isArrayInit
                                ? [targetVarRef, (decl.init as MemberExpression).object, (decl.init as MemberExpression).property]
                                : [targetVarRef, decl.init],
                        } as CallExpression
                    : {
                        type: 'Identifier',
                        name: 'undefined',
                    } as Identifier,
            } as AssignmentExpression,
        }

        if (isArrayPatternVar) {
            (assignmentExpr.expression.right as { object: { property: { name: string } } }).object.property.name += `?.[0][${(decl.init as { property: { value: unknown } }).property.value}]`;
            const obj = (assignmentExpr.expression.right as { object: Expression | SpreadElement }).object;

            assignmentExpr.expression.right = {
                type: 'CallExpression',
                callee: {
                    type: 'MemberExpression',
                    object: {
                        type: 'Identifier',
                        name: CONTEXT_NAME,
                    } as Identifier,
                    property: {
                        type: 'Identifier',
                        name: 'init',
                    } as Identifier,
                    computed: false,
                } as MemberExpression,
                arguments: [targetVarRef, obj /*, decl.init.property.value*/],
            } as CallExpression;
        }

        if (isArrowFunction) {
            // Transform the body of arrow functions
            scopeManager.pushScope('fn');
            walk.recursive((decl.init as ArrowFunctionExpression).body, scopeManager, {
                BlockStatement(node, state, c) {
                    //state.pushScope('block');
                    node.body.forEach((stmt) => c(stmt, state));
                    //state.popScope();
                },
                IfStatement(node, state, c) {
                    state.pushScope('if');
                    c(node.consequent, state);
                    if (node.alternate) {
                        state.pushScope('els');
                        c(node.alternate, state);
                        state.popScope();
                    }
                    state.popScope();
                },
                VariableDeclaration(node, state) {
                    transformVariableDeclaration(node, state);
                },
                Identifier(node, state) {
                    transformIdentifier(node, state);
                },
                AssignmentExpression(node, state) {
                    transformAssignmentExpression(node, state);
                },
            });
            scopeManager.popScope();
        }

        // Replace the original node with the transformed assignment
        Object.assign(varNode, assignmentExpr);
    });
}

function transformIdentifier(node: Identifier, scopeManager: ScopeManager): void {
    // Transform identifiers to use the context object
    if (node.name !== CONTEXT_NAME) {
        // Skip transformation for global and native objects
        if (
            node.name === 'Math' ||
            node.name === 'NaN' ||
            node.name === 'undefined' ||
            node.name === 'Infinity' ||
            node.name === 'null' ||
            (node.name.startsWith("'") && node.name.endsWith("'")) ||
            (node.name.startsWith('"') && node.name.endsWith('"')) ||
            (node.name.startsWith('`') && node.name.endsWith('`'))
        ) {
            return;
        }

        // Skip transformation for loop variables
        if (scopeManager.isLoopVariable(node.name)) {
            return;
        }

        // If it's a nested function parameter (but not a root parameter), skip transformation
        if (scopeManager.isContextBound(node.name) && !scopeManager.isRootParam(node.name)) {
            return;
        }

        const nodeParent = (node as More).parent;

        // Check if this identifier is part of a namespace member access (e.g., ta.ema)
        const isNamespaceMember =
            nodeParent && isMemberExpression(nodeParent) && nodeParent.object === node && scopeManager.isContextBound(node.name);

        // Check if this identifier is part of a param() call
        const isParamCall =
            nodeParent &&
            isCallExpression(nodeParent) &&
            nodeParent.callee &&
            isMemberExpression(nodeParent.callee) &&
            (nodeParent.callee.property as { name: string }).name === 'param';

        const isInit = nodeParent && isAssignmentExpression(nodeParent) && nodeParent.left === node;
        // Check if this identifier is an argument to a namespace function
        const isNamespaceFunctionArg =
            nodeParent &&
            isCallExpression(nodeParent) &&
            nodeParent.callee &&
            isMemberExpression(nodeParent.callee) &&
            scopeManager.isContextBound((nodeParent.callee.object as { name: string }).name);

        // Check if this identifier is part of an array access
        const isArrayAccess = nodeParent && isMemberExpression(nodeParent) && nodeParent.computed;

        // Check if this identifier is part of an array access that's an argument to a namespace function
        const isArrayIndexInNamespaceCall =
            nodeParent &&
            isMemberExpression(nodeParent) &&
            nodeParent.computed &&
            nodeParent.property === node &&
            (nodeParent as More).parent &&
            isCallExpression((nodeParent as More).parent) &&
            ((nodeParent as More).parent as { callee?: Expression }).callee &&
            isMemberExpression(((nodeParent as More).parent as { callee?: Expression }).callee) &&
            scopeManager.isContextBound(((nodeParent as More).parent as { callee?: { object: { name: string } } }).callee.object.name);

        // Check if this identifier is a function being called
        const isFunctionCall = nodeParent && isCallExpression(nodeParent) && nodeParent.callee === node;

        if (isNamespaceMember || isParamCall || isNamespaceFunctionArg || isArrayIndexInNamespaceCall || isFunctionCall) {
            // For function calls, we should just use the original name without scoping
            if (isFunctionCall) {
                return;
            }
            // Don't add [0] for namespace function arguments or array indices
            const [scopedName, kind] = scopeManager.getVariable(node.name);
            Object.assign(node, {
                type: 'MemberExpression',
                object: {
                    type: 'MemberExpression',
                    object: {
                        type: 'Identifier',
                        name: CONTEXT_NAME,
                    },
                    property: {
                        type: 'Identifier',
                        name: kind,
                    },
                    computed: false,
                },
                property: {
                    type: 'Identifier',
                    name: scopedName,
                },
                computed: false,
            });
            return;
        }

        const [scopedName, kind] = scopeManager.getVariable(node.name);
        const memberExpr = {
            type: 'MemberExpression',
            object: {
                type: 'MemberExpression',
                object: {
                    type: 'Identifier',
                    name: CONTEXT_NAME,
                },
                property: {
                    type: 'Identifier',
                    name: kind,
                },
                computed: false,
            },
            property: {
                type: 'Identifier',
                name: scopedName,
            },
            computed: false,
        };

        // Check if parent node is already a member expression with computed property (array access)
        const hasArrayAccess = nodeParent && isMemberExpression(nodeParent) && nodeParent.computed && nodeParent.object === node;

        if (!hasArrayAccess && !isArrayAccess) {
            // Add [0] array access if not already present and not part of array access
            Object.assign(node, {
                type: 'MemberExpression',
                object: memberExpr,
                property: {
                    type: 'Literal',
                    value: 0,
                },
                computed: true,
            });
        } else {
            // Just replace with the member expression without adding array access
            Object.assign(node, memberExpr);
        }
    }
}

function transformAssignmentExpression(node: AssignmentExpression, scopeManager: ScopeManager): void {
    // Transform assignment expressions to use the context object
    if (isIdentifier(node.left)) {
        const [varName, kind] = scopeManager.getVariable(node.left.name);
        const memberExpr = {
            type: 'MemberExpression',
            object: {
                type: 'MemberExpression',
                object: {
                    type: 'Identifier',
                    name: CONTEXT_NAME,
                } as Identifier,
                property: {
                    type: 'Identifier',
                    name: kind,
                } as Identifier,
                computed: false,
            } as MemberExpression,
            property: {
                type: 'Identifier',
                name: varName,
            } as Identifier,
            computed: false,
        } as MemberExpression;

        // Add [0] array access for assignment target
        node.left = {
            type: 'MemberExpression',
            object: memberExpr,
            property: {
                type: 'Literal',
                value: 0,
            } as Literal,
            computed: true,
        } as MemberExpression;
    }

    // Transform identifiers in the right side of the assignment
    walk.recursive(
        node.right,
        { parent: node.right, inNamespaceCall: false },
        {
            Identifier(node, state, c) {
                //special case for na
                if (node.name == 'na') {
                    node.name = 'NaN';
                }
                (node as More).parent = state.parent;
                transformIdentifier(node, scopeManager);
                const nodeParent = (node as More).parent;
                const isBinaryOperation = nodeParent && isBinaryExpression(nodeParent);
                const isConditional = nodeParent && isConditionalExpression(nodeParent);
                const isContextBound = scopeManager.isContextBound(node.name) && !scopeManager.isRootParam(node.name);
                const hasArrayAccess = nodeParent && isMemberExpression(nodeParent) && nodeParent.computed && nodeParent.object === node;
                const isParamCall = nodeParent && (nodeParent as More)._isParamCall;
                const isAMemberExpression = nodeParent && isMemberExpression(nodeParent);
                const isReserved = node.name === 'NaN';

                if (isContextBound || isConditional || isBinaryOperation) {
                    if (isMemberExpression(node)) {
                        transformArrayIndex(node, scopeManager);
                    } else if (node.type === 'Identifier' && !isAMemberExpression && !hasArrayAccess && !isParamCall && !isReserved) {
                        addArrayAccess(node, scopeManager);
                    }
                }
            },
            MemberExpression(node, state, c) {
                // Transform array indices first
                transformArrayIndex(node, scopeManager);
                // Then continue with object transformation
                if (node.object) {
                    c(node.object, { parent: node, inNamespaceCall: state.inNamespaceCall });
                }
            },
            CallExpression(node, state, c) {
                const isNamespaceCall =
                    node.callee &&
                    isMemberExpression(node.callee) &&
                    node.callee.object &&
                    isIdentifier(node.callee.object) &&
                    scopeManager.isContextBound(node.callee.object.name);

                // First transform the call expression itself
                transformCallExpression(node, scopeManager);

                // Then transform its arguments with the correct context
                node.arguments.forEach((arg) => c(arg, { parent: node, inNamespaceCall: isNamespaceCall || state.inNamespaceCall }));

                // Add [0] to the function call result if it's a namespace call and hasn't been wrapped yet
                // and it's not a param() call
                // if (!node._arrayWrapped && isNamespaceCall && node.callee.property.name !== 'param') {
                //     const wrappedNode = {
                //         type: 'MemberExpression',
                //         object: { ...node },
                //         property: {
                //             type: 'Literal',
                //             value: 0,
                //         },
                //         computed: true,
                //     };
                //     Object.assign(node, wrappedNode);
                //     node._arrayWrapped = true;
                // }
            },
        }
    );
}

function createWrapperFunction(arrowFunction: ArrowFunctionExpression): unknown {
    // Create a wrapper function with the context parameter
    return {
        type: 'FunctionDeclaration',
        id: null,
        params: [
            {
                type: 'Identifier',
                name: 'context',
            },
        ],
        body: {
            type: 'BlockStatement',
            body: [
                {
                    type: 'ReturnStatement',
                    argument: arrowFunction,
                },
            ],
        },
    };
}

function transformArrowFunctionParams(node: ArrowFunctionExpression, scopeManager: ScopeManager, isRootFunction: boolean = false): void {
    // Register arrow function parameters as context-bound
    node.params.forEach((param) => {
        if (isIdentifier(param)) {
            scopeManager.addContextBoundVar(param.name, isRootFunction);
        }
    });
}

function transformWhileStatement(node: WhileStatement, scopeManager: ScopeManager, c: walk.WalkerCallback<ScopeManager>): void {
    // Transform the test condition of the while loop
    walk.simple(node.test, {
        Identifier(idNode) {
            transformIdentifier(idNode, scopeManager);
        },
    });

    // Process the body of the while loop
    scopeManager.pushScope('whl');
    c(node.body, scopeManager);
    scopeManager.popScope();
}

function transformReturnStatement(node: ReturnStatement, scopeManager: ScopeManager): void {
    const curScope = scopeManager.getCurrentScopeType();
    // Transform the return argument if it exists
    if (node.argument) {
        if (isArrayExpression(node.argument)) {
            // Transform each element in the array
            node.argument.elements = node.argument.elements.map((element) => {
                if (isIdentifier(element)) {
                    // Skip transformation if it's a context-bound variable
                    if (scopeManager.isContextBound(element.name) && !scopeManager.isRootParam(element.name)) {
                        // Only add [0] if it's not already an array access
                        return {
                            type: 'MemberExpression',
                            object: element,
                            property: {
                                type: 'Literal',
                                value: 0,
                            } as Literal,
                            computed: true,
                            optional: false,
                        } as MemberExpression;
                    }

                    // Transform non-context-bound variables
                    const [scopedName, kind] = scopeManager.getVariable(element.name);
                    return {
                        type: 'MemberExpression',
                        object: {
                            type: 'MemberExpression',
                            object: {
                                type: 'MemberExpression',
                                object: {
                                    type: 'Identifier',
                                    name: CONTEXT_NAME,
                                } as Identifier,
                                property: {
                                    type: 'Identifier',
                                    name: kind,
                                } as Identifier,
                                computed: false,
                            },
                            property: {
                                type: 'Identifier',
                                name: scopedName,
                            } as Identifier,
                            computed: false,
                        },
                        property: {
                            type: 'Literal',
                            value: 0,
                        } as Literal,
                        computed: true,
                    } as MemberExpression;

                } else if (isMemberExpression(element)) {
                    // If it's already a member expression (array access), leave it as is
                    if (
                        element.computed &&
                        isIdentifier(element.object) &&
                        scopeManager.isContextBound(element.object.name) &&
                        !scopeManager.isRootParam(element.object.name)
                    ) {
                        return element;
                    }
                    // Otherwise, transform it normally
                    transformMemberExpression(element, '', scopeManager);
                    return element;
                }
                return element;
            });

            node.argument = {
                type: 'ArrayExpression',
                elements: [node.argument],
            } as ArrayExpression;
        } else if (isBinaryExpression(node.argument)) {
            // Transform both operands of the binary expression
            walk.recursive(node.argument, scopeManager, {
                Identifier(node, state) {
                    transformIdentifier(node, state);
                    if (isIdentifier(node)) {
                        addArrayAccess(node, state);
                    }
                },
                MemberExpression(node) {
                    transformMemberExpression(node, '', scopeManager);
                },
            });
        } else if (isObjectExpression(node.argument)) {
            // Handle object expressions (existing code)
            node.argument.properties = node.argument.properties.map((prop) => {
                // Check for shorthand properties
                if ('shorthand' in prop && prop.shorthand && 'name' in prop.value && 'name' in prop.key) {
                    // Get the variable name and kind
                    const [scopedName, kind] = scopeManager.getVariable(prop.value.name);

                    // Convert shorthand to full property definition
                    return {
                        type: 'Property',
                        key: {
                            type: 'Identifier',
                            name: prop.key.name,
                        },
                        value: {
                            type: 'MemberExpression',
                            object: {
                                type: 'MemberExpression',
                                object: {
                                    type: 'Identifier',
                                    name: CONTEXT_NAME,
                                },
                                property: {
                                    type: 'Identifier',
                                    name: kind,
                                },
                                computed: false,
                            },
                            property: {
                                type: 'Identifier',
                                name: scopedName,
                            },
                            computed: false,
                        },
                        kind: 'init',
                        method: false,
                        shorthand: false,
                        computed: false,
                    } as Property;
                }
                return prop;
            });
        } else if (isIdentifier(node.argument)) {
            transformIdentifier(node.argument, scopeManager);
            if (isIdentifier(node.argument)) {
                addArrayAccess(node.argument, scopeManager);
            }
            // Handle identifier return values
            // const [scopedName, kind] = scopeManager.getVariable(node.argument.name);
            // node.argument = {
            //     type: 'MemberExpression',
            //     object: {
            //         type: 'MemberExpression',
            //         object: {
            //             type: 'Identifier',
            //             name: CONTEXT_NAME,
            //         },
            //         property: {
            //             type: 'Identifier',
            //             name: kind,
            //         },
            //         computed: false,
            //     },
            //     property: {
            //         type: 'Identifier',
            //         name: scopedName,
            //     },
            //     computed: false,
            // };

            // // Add [0] array access
            // node.argument = {
            //     type: 'MemberExpression',
            //     object: node.argument,
            //     property: {
            //         type: 'Literal',
            //         value: 0,
            //     },
            //     computed: true,
            // };
        }

        if (curScope === 'fn') {
            //for nested functions : wrap the return argument in a CallExpression with math._precision(<statement>)
            // Process different types of return arguments
            if (
                isIdentifier(node.argument) &&
                scopeManager.isContextBound(node.argument.name) &&
                !scopeManager.isRootParam(node.argument.name)
            ) {
                // For context-bound identifiers, add [0] array access if not already an array access
                node.argument = {
                    type: 'MemberExpression',
                    object: node.argument,
                    property: {
                        type: 'Literal',
                        value: 0,
                    } as Literal,
                    computed: true,
                } as MemberExpression;
            } else if (isMemberExpression(node.argument)) {
                // For member expressions, check if the object is context-bound
                if (
                    isIdentifier(node.argument.object) &&
                    scopeManager.isContextBound(node.argument.object.name) &&
                    !scopeManager.isRootParam(node.argument.object.name)
                ) {
                    // Transform array indices first if not already transformed
                    if (!(node.argument as More)._indexTransformed) {
                        transformArrayIndex(node.argument, scopeManager);
                        (node.argument as More)._indexTransformed = true;
                    }
                }
            } else if (
                isBinaryExpression(node.argument) ||
                isLogicalExpression(node.argument) ||
                isConditionalExpression(node.argument) ||
                isCallExpression(node.argument)
            ) {
                // For complex expressions, walk the AST and transform all identifiers and expressions
                walk.recursive(node.argument, scopeManager, {
                    Identifier(node, state) {
                        transformIdentifier(node, state);
                        // Add array access if needed
                        if (isIdentifier(node) && !(node as More)._arrayAccessed) {
                            addArrayAccess(node, state);
                            (node as More)._arrayAccessed = true;
                        }
                    },
                    MemberExpression(node) {
                        transformMemberExpression(node, '', scopeManager);
                    },
                    CallExpression(node, state) {
                        transformCallExpression(node, state);
                    },
                });
            }

            node.argument = {
                type: 'CallExpression',
                callee: {
                    type: 'MemberExpression',
                    object: {
                        type: 'Identifier',
                        name: CONTEXT_NAME
                    } as Identifier,
                    property: {
                        type: 'Identifier',
                        name: 'precision'
                    } as Identifier,
                } as MemberExpression,
                arguments: [node.argument],
            } as CallExpression;
        }
    }
}

function transformIdentifierForParam(node: Identifier, scopeManager: ScopeManager) {
    if (isIdentifier(node)) {
        if (node.name === 'na') {
            node.name = 'NaN';
            return node;
        }

        // Skip transformation for loop variables
        if (scopeManager.isLoopVariable(node.name)) {
            return node;
        }
        // If it's a root parameter, transform it with $.let prefix
        if (scopeManager.isRootParam(node.name)) {
            const [scopedName, kind] = scopeManager.getVariable(node.name);
            return {
                type: 'MemberExpression',
                object: {
                    type: 'MemberExpression',
                    object: {
                        type: 'Identifier',
                        name: CONTEXT_NAME,
                    },
                    property: {
                        type: 'Identifier',
                        name: kind,
                    },
                    computed: false,
                },
                property: {
                    type: 'Identifier',
                    name: scopedName,
                },
                computed: false,
            } as MemberExpression;
        }
        // If it's a nested function parameter or other context-bound variable, return as is
        if (scopeManager.isContextBound(node.name)) {
            return node;
        }
        // Otherwise transform with $.let prefix
        const [scopedName, kind] = scopeManager.getVariable(node.name);

        return {
            type: 'MemberExpression',
            object: {
                type: 'MemberExpression',
                object: {
                    type: 'Identifier',
                    name: CONTEXT_NAME,
                },
                property: {
                    type: 'Identifier',
                    name: kind,
                },
                computed: false,
            },
            property: {
                type: 'Identifier',
                name: scopedName,
            },
            computed: false,
        } as MemberExpression;
    }
    return node;
}

function getParamFromUnaryExpression(node: UnaryExpression, scopeManager: ScopeManager, namespace: string) {
    // Transform the argument
    const transformedArgument = transformOperand(node.argument, scopeManager, namespace);

    // Create the unary expression
    const unaryExpr = {
        type: 'UnaryExpression',
        operator: node.operator,
        prefix: node.prefix,
        argument: transformedArgument,
        start: node.start,
        end: node.end,
    } as UnaryExpression;

    return unaryExpr;
    // Wrap the unary expression with namespace.param()
    // return {
    //     type: 'CallExpression',
    //     callee: {
    //         type: 'MemberExpression',
    //         object: {
    //             type: 'Identifier',
    //             name: namespace,
    //         },
    //         property: {
    //             type: 'Identifier',
    //             name: 'param',
    //         },
    //         computed: false,
    //     },
    //     arguments: [unaryExpr, transformedArgument.property, scopeManager.nextParamIdArg],
    //     _transformed: true,
    //     _isParamCall: true,
    // };
}

function transformOperand(node: Expression | PrivateIdentifier, scopeManager: ScopeManager, namespace: string = ''): Expression | PrivateIdentifier {
    switch (node.type) {
        case 'BinaryExpression': {
            return getParamFromBinaryExpression(node, scopeManager, namespace);
        }
        case 'MemberExpression': {
            // Handle array access
            const transformedObject = isIdentifier(node.object) ? transformIdentifierForParam(node.object, scopeManager) : node.object;
            // Don't add [0] if this is already an array access
            return {
                type: 'MemberExpression',
                object: transformedObject,
                property: node.property,
                computed: node.computed,
            } as MemberExpression;
        }
        case 'Identifier': {
            // Skip transformation for loop variables
            if (scopeManager.isLoopVariable(node.name)) {
                return node;
            }

            const nodeParent = (node as More).parent;
            // Check if this identifier is part of a member expression (array access)
            const isMemberExprProperty = nodeParent && isMemberExpression(nodeParent) && nodeParent.property === node;
            if (isMemberExprProperty) {
                return node;
            }
            const transformedObject = transformIdentifierForParam(node, scopeManager);

            return {
                type: 'MemberExpression',
                object: transformedObject,
                property: {
                    type: 'Literal',
                    value: 0,
                },
                computed: true,
            } as MemberExpression;
        }
        case 'UnaryExpression': {
            return getParamFromUnaryExpression(node, scopeManager, namespace);
        }
    }

    return node;
}

function getParamFromBinaryExpression(node: BinaryExpression, scopeManager: ScopeManager, namespace: string): BinaryExpression {
    // Transform both operands
    const transformedLeft = transformOperand(node.left, scopeManager, namespace);
    const transformedRight = transformOperand(node.right, scopeManager, namespace);

    // if (transformedLeft?.property?.type === 'Identifier') {
    //     transformMemberExpression(transformedLeft, '', scopeManager);
    //     //transformIdentifier(transformedLeft.property, scopeManager);
    // }
    // Create the binary expression
    const binaryExpr = {
        type: 'BinaryExpression',
        operator: node.operator,
        left: transformedLeft,
        right: transformedRight,
        start: node.start,
        end: node.end,
    } as BinaryExpression;

    // Walk through the binary expression to transform any function calls
    walk.recursive(binaryExpr, scopeManager, {
        CallExpression(node, scopeManager: ScopeManager) {
            if (!(node as More)._transformed) {
                transformCallExpression(node, scopeManager);
            }
        },
        MemberExpression(node) {
            transformMemberExpression(node, '', scopeManager);
        },
    });

    return binaryExpr;
    // Wrap the binary expression with namespace.param()
    // return {
    //     type: 'CallExpression',
    //     callee: {
    //         type: 'MemberExpression',
    //         object: {
    //             type: 'Identifier',
    //             name: namespace,
    //         },
    //         property: {
    //             type: 'Identifier',
    //             name: 'param',
    //         },
    //         computed: false,
    //     },
    //     arguments: [binaryExpr, UNDEFINED_ARG, scopeManager.nextParamIdArg],
    //     _transformed: true,
    //     _isParamCall: true,
    // };
}

function getParamFromLogicalExpression(node: LogicalExpression, scopeManager: ScopeManager, namespace: string): LogicalExpression {
    // Transform both operands
    const transformedLeft = transformOperand(node.left, scopeManager, namespace);
    const transformedRight = transformOperand(node.right, scopeManager, namespace);

    const logicalExpr = {
        type: 'LogicalExpression',
        operator: node.operator,
        left: transformedLeft,
        right: transformedRight,
        start: node.start,
        end: node.end,
    } as LogicalExpression;

    // Walk through the logical expression to transform any function calls
    walk.recursive(logicalExpr, scopeManager, {
        CallExpression(node, scopeManager: ScopeManager) {
            if (!(node as More)._transformed) {
                transformCallExpression(node, scopeManager);
            }
        },
    });

    return logicalExpr;

    // return {
    //     type: 'CallExpression',
    //     callee: {
    //         type: 'MemberExpression',
    //         object: { type: 'Identifier', name: namespace },
    //         property: { type: 'Identifier', name: 'param' },
    //     },
    //     arguments: [logicalExpr, UNDEFINED_ARG, scopeManager.nextParamIdArg],
    //     _transformed: true,
    //     _isParamCall: true,
    // };
}

function getParamFromConditionalExpression(node: Expression, scopeManager: ScopeManager, namespace: string): CallExpression {
    // Transform identifiers in the right side of the assignment
    walk.recursive(
        node,
        { parent: node, inNamespaceCall: false },
        {
            Identifier(node, state, c) {
                if (node.name == 'NaN') return;
                if (node.name == 'na') {
                    node.name = 'NaN';
                    return;
                }

                (node as More).parent = state.parent;
                const nodeParent = (node as More).parent;
                transformIdentifier(node, scopeManager);
                const isBinaryOperation = nodeParent && isBinaryExpression(nodeParent);
                const isConditional = nodeParent && isConditionalExpression(nodeParent);

                if (isConditional || isBinaryOperation) {
                    if (isMemberExpression(node)) {
                        transformArrayIndex(node, scopeManager);
                    } else if (node.type === 'Identifier') {
                        addArrayAccess(node, scopeManager);
                    }
                }
            },
            MemberExpression(node, state, c) {
                // Transform array indices first
                transformArrayIndex(node, scopeManager);
                // Then continue with object transformation
                if (node.object) {
                    c(node.object, { parent: node, inNamespaceCall: state.inNamespaceCall });
                }
            },
            CallExpression(node, state, c) {
                const isNamespaceCall =
                    node.callee &&
                    isMemberExpression(node.callee) &&
                    node.callee.object &&
                    isIdentifier(node.callee.object) &&
                    scopeManager.isContextBound(node.callee.object.name);

                // First transform the call expression itself
                transformCallExpression(node, scopeManager);

                // Then transform its arguments with the correct context
                node.arguments.forEach((arg) => c(arg, { parent: node, inNamespaceCall: isNamespaceCall || state.inNamespaceCall }));
            },
        }
    );

    return {
        type: 'CallExpression',
        callee: {
            type: 'MemberExpression',
            object: {
                type: 'Identifier',
                name: namespace
            } as Identifier,
            property: {
                type: 'Identifier',
                name: 'param'
            } as Identifier,
        } as MemberExpression,
        arguments: [node, UNDEFINED_ARG, scopeManager.nextParamIdArg],
        _transformed: true,
        _isParamCall: true,
    } as unknown as CallExpression;
}

function transformFunctionArgument(arg: Expression | SpreadElement, namespace: string, scopeManager: ScopeManager) {
    // Handle binary expressions (arithmetic operations)

    switch (arg?.type) {
        case 'BinaryExpression':
            arg = getParamFromBinaryExpression(arg, scopeManager, namespace);
            break;
        case 'LogicalExpression':
            arg = getParamFromLogicalExpression(arg, scopeManager, namespace);
            break;
        case 'ConditionalExpression':
            return getParamFromConditionalExpression(arg, scopeManager, namespace);
        case 'UnaryExpression':
            arg = getParamFromUnaryExpression(arg, scopeManager, namespace);
            break;
        // case 'Identifier':
        //     return transformOperand(arg, scopeManager, namespace);
    }

    // Check if the argument is an array access
    const isArrayAccess = isMemberExpression(arg) && arg.computed && arg.property;

    if (isArrayAccess) {
        // Transform array access
        const transformedObject = 'object' in arg && (
            isIdentifier(arg.object) && scopeManager.isContextBound(arg.object.name) && !scopeManager.isRootParam(arg.object.name)
                ? arg.object
                : transformIdentifierForParam(arg.object as Identifier, scopeManager));

        // Transform the index if it's an identifier
        const transformedProperty =
            'property' in arg && (
                isIdentifier(arg.property) && !scopeManager.isContextBound(arg.property.name) && !scopeManager.isLoopVariable(arg.property.name)
                    ? transformIdentifierForParam(arg.property, scopeManager)
                    : arg.property);

        // const memberExpr = {
        //     type: 'MemberExpression',
        //     object: transformedObject,
        //     property: transformedProperty,
        //     computed: true,
        // };

        return {
            type: 'CallExpression',
            callee: {
                type: 'MemberExpression',
                object: {
                    type: 'Identifier',
                    name: namespace,
                } as Identifier,
                property: {
                    type: 'Identifier',
                    name: 'param',
                } as Identifier,
                computed: false,
            },
            arguments: [transformedObject, transformedProperty, scopeManager.nextParamIdArg],
            _transformed: true,
            _isParamCall: true,
        } as unknown as CallExpression;
    }

    if (isObjectExpression(arg)) {
        arg.properties = arg.properties.map((prop) => {
            // Get the variable name and kind
            if ('value' in prop && 'name' in prop.value && prop.value.name && 'key' in prop && 'name' in prop.key) {
                const [scopedName, kind] = scopeManager.getVariable(prop.value.name);

                // Convert shorthand to full property definition
                return {
                    type: 'Property',
                    key: {
                        type: 'Identifier',
                        name: prop.key.name,
                    },
                    value: {
                        type: 'MemberExpression',
                        object: {
                            type: 'MemberExpression',
                            object: {
                                type: 'Identifier',
                                name: CONTEXT_NAME,
                            },
                            property: {
                                type: 'Identifier',
                                name: kind,
                            },
                            computed: false,
                        },
                        property: {
                            type: 'Identifier',
                            name: scopedName,
                        },
                        computed: false,
                    },
                    kind: 'init',
                    method: false,
                    shorthand: false,
                    computed: false,
                } as Property;
            }
            return prop;
        });
    }
    // For non-array-access arguments
    if (isIdentifier(arg)) {
        if (arg.name === 'na') {
            arg.name = 'NaN';
            return arg;
        }
        // If it's a context-bound variable (like a nested function parameter), use it directly
        if (scopeManager.isContextBound(arg.name) && !scopeManager.isRootParam(arg.name)) {
            return {
                type: 'CallExpression',
                callee: {
                    type: 'MemberExpression',
                    object: {
                        type: 'Identifier',
                        name: namespace,
                    },
                    property: {
                        type: 'Identifier',
                        name: 'param',
                    },
                    computed: false,
                },
                arguments: [arg, UNDEFINED_ARG, scopeManager.nextParamIdArg],
                _transformed: true,
                _isParamCall: true,
            } as unknown as CallExpression;
        }
    }

    // For all other cases, transform normally

    if (arg?.type === 'CallExpression') {
        transformCallExpression(arg, scopeManager, namespace);
    }
    return {
        type: 'CallExpression',
        callee: {
            type: 'MemberExpression',
            object: {
                type: 'Identifier',
                name: namespace,
            },
            property: {
                type: 'Identifier',
                name: 'param',
            },
            computed: false,
        },
        arguments: [isIdentifier(arg)
            ? transformIdentifierForParam(arg, scopeManager)
            : arg, UNDEFINED_ARG, scopeManager.nextParamIdArg],
        _transformed: true,
        _isParamCall: true,
    } as unknown as CallExpression;
}

function transformCallExpression(node: CallExpression, scopeManager: ScopeManager, namespace?: string): void {
    // Skip if this node has already been transformed
    if ((node as More)._transformed) {
        return;
    }

    // Check if this is a namespace method call (e.g., ta.ema, math.abs)
    const isNamespaceCall =
        node.callee &&
        isMemberExpression(node.callee) &&
        node.callee.object &&
        isIdentifier(node.callee.object) &&
        (scopeManager.isContextBound(node.callee.object.name) || node.callee.object.name === 'math' || node.callee.object.name === 'ta');

    if (isNamespaceCall) {
        const namespace = ((node.callee as MemberExpression).object as Identifier).name;
        // Transform arguments using the namespace's param
        node.arguments = node.arguments.map((arg) => {
            // If argument is already a param call, don't wrap it again
            if ((arg as More)._isParamCall) {
                return arg;
            }
            return transformFunctionArgument(arg, namespace, scopeManager);
        });

        // Inject unique call ID for TA functions to enable proper state management
        if (namespace === 'ta') {
            node.arguments.push(scopeManager.getNextTACallId());
        }

        (node as More)._transformed = true;
    }
    // Check if this is a regular function call (not a namespace method)
    else if (node.callee && isIdentifier(node.callee)) {
        // Transform arguments using $.param
        node.arguments = node.arguments.map((arg) => {
            // If argument is already a param call, don't wrap it again
            if ((arg as More)._isParamCall) {
                return arg;
            }
            return transformFunctionArgument(arg, CONTEXT_NAME, scopeManager);
        });
        (node as More)._transformed = true;
    }

    // Transform any nested call expressions in the arguments
    node.arguments.forEach((arg) => {
        walk.recursive(arg,
            { parent: node as Expression, inNamespaceCall: false },
            {
                Identifier(node, state) {
                    (node as More).parent = (state as unknown as { parent: Expression }).parent;
                    const nodeParent = (node as More).parent;
                    transformIdentifier(node, scopeManager);
                    const isBinaryOperation = nodeParent && isBinaryExpression(nodeParent);
                    const isConditional = nodeParent && isConditionalExpression(nodeParent);

                    if (isConditional || isBinaryOperation) {
                        if (isMemberExpression(node)) {
                            transformArrayIndex(node, scopeManager);
                        } else if (isIdentifier(node)) {
                            addArrayAccess(node, scopeManager);
                        }
                    }
                },
                CallExpression(node, state, c) {
                    if (!(node as More)._transformed) {
                        // First transform the call expression itself
                        transformCallExpression(node, scopeManager);
                    }
                },
                MemberExpression(node, state, c) {
                    transformMemberExpression(node, '', scopeManager);
                    // Then continue with object transformation
                    if (node.object) {
                        c(node.object, { parent: node, inNamespaceCall: state.inNamespaceCall });
                    }
                },
            });
    });
}

function transformFunctionDeclaration(node: FunctionDeclaration, scopeManager: ScopeManager): void {
    // Register function parameters as context-bound (but not as root params)
    const boundParamNames = [];
    node.params.forEach((param) => {
        if (isIdentifier(param)) {
            scopeManager.addContextBoundVar(param.name, false);
            boundParamNames.push(param.name);
        }
    });

    // Transform the function body
    if (node.body && isBlockStatement(node.body)) {
        scopeManager.pushScope('fn');
        walk.recursive(node.body, scopeManager, {
            BlockStatement(node, state, c) {
                //state.pushScope('block');
                node.body.forEach((stmt) => c(stmt, state));
                //state.popScope();
            },
            ReturnStatement(node, state) {
                transformReturnStatement(node, state);
            },
            VariableDeclaration(node, state) {
                transformVariableDeclaration(node, state);
            },
            Identifier(node, state) {
                transformIdentifier(node, state);
            },
            CallExpression(node, state) {
                // Transform the call expression itself
                transformCallExpression(node, state);

                // Also transform any nested call expressions in the arguments
                node.arguments.forEach((arg) => {
                    if (isBinaryExpression(arg)) {
                        walk.recursive(arg, state, {
                            CallExpression(node, state) {
                                transformCallExpression(node, state);
                            },
                            MemberExpression(node) {
                                transformMemberExpression(node, '', state);
                            },
                        });
                    }
                });
            },
            MemberExpression(node) {
                transformMemberExpression(node, '', scopeManager);
            },
            AssignmentExpression(node, state) {
                transformAssignmentExpression(node, state);
            },
            ForStatement(node, state, c) {
                transformForStatement(node, state, c);
            },
            IfStatement(node, state, c) {
                transformIfStatement(node, state, c);
            },
            BinaryExpression(node, state, c) {
                // Transform both sides of binary expressions
                walk.recursive(node, state, {
                    CallExpression(node, state) {
                        transformCallExpression(node, state);
                    },
                    MemberExpression(node) {
                        transformMemberExpression(node, '', state);
                    },
                });
            },
        });
        scopeManager.popScope();
    }
}

function addArrayAccess(node: Identifier, scopeManager: ScopeManager): void {
    Object.assign(node, {
        type: 'MemberExpression',
        object: {
            type: 'Identifier',
            name: node.name,
            start: node.start,
            end: node.end,
        },
        property: {
            type: 'Literal',
            value: 0,
        },
        computed: true,
        _indexTransformed: true,
    });
}

function transformForStatement(node: ForStatement, scopeManager: ScopeManager, c: walk.WalkerCallback<ScopeManager>): void {
    // Handle initialization
    if (node.init && isVariableDeclaration(node.init)) {
        // Keep the original loop variable name
        const decl = node.init.declarations[0];
        const originalName = (decl.id as Identifier).name;
        scopeManager.addLoopVariable(originalName, originalName);

        // Keep the original variable declaration
        node.init = {
            type: 'VariableDeclaration',
            kind: node.init.kind,
            declarations: [
                {
                    start: NaN,
                    end: NaN,
                    type: 'VariableDeclarator',
                    id: {
                        type: 'Identifier',
                        name: originalName,
                    } as Identifier,
                    init: decl.init,
                },
            ],
        } as VariableDeclaration;

        // Transform any identifiers in the init expression
        if (decl.init) {
            walk.recursive(decl.init, scopeManager, {
                Identifier(node, state) {
                    if (!scopeManager.isLoopVariable(node.name)) {
                        scopeManager.pushScope('for');
                        transformIdentifier(node, state);
                        scopeManager.popScope();
                    }
                },
                MemberExpression(node) {
                    scopeManager.pushScope('for');
                    transformMemberExpression(node, '', scopeManager);
                    scopeManager.popScope();
                },
            });
        }
    }

    // Transform test condition
    if (node.test) {
        walk.recursive(node.test, scopeManager, {
            Identifier(node, state) {
                if (!scopeManager.isLoopVariable(node.name) && ('computed' in node && !node.computed || !('computed' in node))) {
                    scopeManager.pushScope('for');
                    transformIdentifier(node, state);
                    if (isIdentifier(node)) {
                        (node as unknown as { computed: boolean }).computed = true;
                        addArrayAccess(node, state);
                    }
                    scopeManager.popScope();
                }
            },
            MemberExpression(node) {
                scopeManager.pushScope('for');
                transformMemberExpression(node, '', scopeManager);
                scopeManager.popScope();
            },
        });
    }

    // Transform update expression
    if (node.update) {
        walk.recursive(node.update, scopeManager, {
            Identifier(node, state) {
                if (!scopeManager.isLoopVariable(node.name)) {
                    scopeManager.pushScope('for');
                    transformIdentifier(node, state);
                    scopeManager.popScope();
                }
            },
        });
    }

    // Transform the loop body
    scopeManager.pushScope('for');
    c(node.body, scopeManager);
    scopeManager.popScope();
}

function transformExpression(node: Expression, scopeManager: ScopeManager): void {
    walk.recursive(node, scopeManager, {
        MemberExpression(node) {
            transformMemberExpression(node, '', scopeManager);
        },

        CallExpression(node, state) {
            transformCallExpression(node, state);
        },
        Identifier(node, state) {
            transformIdentifier(node, state);

            //context bound variable was not transformed, but we still need to ensure array annotation
            const isIfStatement = scopeManager.getCurrentScopeType() === 'if';
            const isContextBound = scopeManager.isContextBound(node.name) && !scopeManager.isRootParam(node.name);
            if (isContextBound && isIfStatement) {
                addArrayAccess(node, state);
            }
        },
    });
}

function transformIfStatement(node: IfStatement, scopeManager: ScopeManager, c: walk.WalkerCallback<ScopeManager>): void {
    // Transform the test condition
    if (node.test) {
        scopeManager.pushScope('if');
        transformExpression(node.test, scopeManager);
        scopeManager.popScope();
    }

    // Transform the if branch (consequent)
    scopeManager.pushScope('if');
    c(node.consequent, scopeManager);
    scopeManager.popScope();

    // Transform the else branch (alternate) if it exists
    if (node.alternate) {
        scopeManager.pushScope('els');
        c(node.alternate, scopeManager);
        scopeManager.popScope();
    }
}

function transformNestedArrowFunctions(ast: Program): void {
    walk.recursive(ast, null, {
        VariableDeclaration(node, state, c) {
            // Only process if we have declarations
            if (node.declarations && node.declarations.length > 0) {
                const declarations = node.declarations;

                // Check each declaration
                declarations.forEach((decl) => {
                    // Check if it's an arrow function
                    if (decl.init && isArrowFunctionExpression(decl.init)) {
                        const isRootFunction = decl.init.start === 0;

                        if (!isRootFunction) {
                            // Create a function declaration
                            const functionDeclaration = {
                                type: 'FunctionDeclaration',
                                id: decl.id, // Use the variable name as function name
                                params: decl.init.params,
                                body:
                                    isBlockStatement(decl.init.body)
                                        ? decl.init.body
                                        : {
                                            type: 'BlockStatement',
                                            body: [
                                                {
                                                    type: 'ReturnStatement',
                                                    argument: decl.init.body,
                                                },
                                            ],
                                        },
                                async: decl.init.async,
                                generator: false,
                            };

                            // Replace the entire VariableDeclaration with the FunctionDeclaration
                            Object.assign(node, functionDeclaration);
                        }
                    }
                });
            }

            // Continue traversing
            if ('body' in node && node.body && isObject(node.body) && 'body' in node.body && node.body.body) {
                (node.body.body as Node[]).forEach((stmt) => c(stmt, state));
            }
        },
    });
}

// Add new function for pre-processing context-bound variables
function preProcessContextBoundVars(ast: Program, scopeManager: ScopeManager): void {
    walk.simple(ast, {
        VariableDeclaration(node) {
            node.declarations.forEach((decl) => {
                // Check for context property assignments
                const isContextProperty =
                    decl.init &&
                    isMemberExpression(decl.init) &&
                    decl.init.object && 'name' in decl.init.object &&
                    (decl.init.object.name === 'context' || decl.init.object.name === CONTEXT_NAME || decl.init.object.name === 'context2');

                const isSubContextProperty =
                    decl.init &&
                    isMemberExpression(decl.init) &&
                    decl.init.object && 'object' in decl.init.object &&
                    decl.init.object.object && 'name' in decl.init.object.object && (
                        decl.init.object.object.name === 'context' ||
                        decl.init.object.object.name === CONTEXT_NAME ||
                        decl.init.object.object.name === 'context2');

                if (isContextProperty || isSubContextProperty) {
                    if ('name' in decl.id && decl.id.name) {
                        scopeManager.addContextBoundVar(decl.id.name);
                    }
                    if ('properties' in decl.id && decl.id.properties) {
                        decl.id.properties.forEach((property) => {
                            if ('key' in property && 'name' in property.key && property.key.name) {
                                scopeManager.addContextBoundVar(property.key.name);
                            }
                        });
                    }
                }
            });
        },
    });
}

export function transpile(fn: string | Function): Function {
    const code = typeof fn === 'function' ? fn.toString() : fn;

    const parser = Parser.extend(tsPlugin());
    // Parse the code into an AST
    const ast = parser.parse(code.trim(), { sourceType: 'module', ecmaVersion: 'latest' });
    // const ast = acorn.parse(code.trim(), {
    //     ecmaVersion: 'latest',
    //     sourceType: 'module',
    // });

    // Pre-process: Transform all nested arrow functions
    transformNestedArrowFunctions(ast);

    const scopeManager = new ScopeManager();
    let originalParamName: string;

    // Pre-process: Identify context-bound variables
    preProcessContextBoundVars(ast, scopeManager);

    // First pass: register all function declarations and their parameters
    walk.simple(ast, {
        FunctionDeclaration(node) {
            transformFunctionDeclaration(node, scopeManager);
        },
        ArrowFunctionExpression(node) {
            const isRootFunction = node.start === 0;
            if (isRootFunction && node.params && node.params.length > 0 && 'name' in node.params[0]) {
                originalParamName = node.params[0].name;
                node.params[0].name = CONTEXT_NAME;
            }
            transformArrowFunctionParams(node, scopeManager, isRootFunction);
        },
        VariableDeclaration(node) {
            node.declarations.forEach((decl) => {
                if (isArrayPattern(decl.id)) {
                    // Generate a unique temporary variable name
                    const tempVarName = scopeManager.generateTempVar();

                    // Create a new variable declaration for the temporary variable
                    const tempVarDecl = {
                        type: 'VariableDeclaration',
                        kind: node.kind,
                        declarations: [
                            {
                                type: 'VariableDeclarator',
                                id: {
                                    type: 'Identifier',
                                    name: tempVarName,
                                },
                                init: decl.init,
                            },
                        ],
                    };

                    decl.id.elements?.forEach((element) => {
                        if (isIdentifier(element)) {
                            scopeManager.addArrayPatternElement(element.name);
                        }
                    });
                    // Create individual variable declarations for each destructured element
                    const individualDecls = decl.id.elements.map((element, index) => ({
                        type: 'VariableDeclaration',
                        kind: node.kind,
                        declarations: [
                            {
                                type: 'VariableDeclarator',
                                id: element,
                                init: {
                                    type: 'MemberExpression',
                                    object: {
                                        type: 'Identifier',
                                        name: tempVarName,
                                    },
                                    property: {
                                        type: 'Literal',
                                        value: index,
                                    },
                                    computed: true,
                                },
                            },
                        ],
                    }));

                    // Replace the original declaration with the new declarations
                    Object.assign(node, {
                        type: 'BlockStatement',
                        body: [tempVarDecl, ...individualDecls],
                    });
                }
            });
        },
        ForStatement(node) {
            // Skip registering loop variables in the first pass
        },
    });

    // Second pass: transform the code
    walk.recursive(ast, scopeManager, {
        BlockStatement(node, state, c) {
            //state.pushScope('block');
            node.body.forEach((stmt) => c(stmt, state));
            //state.popScope();
        },
        ReturnStatement(node, state) {
            transformReturnStatement(node, state);
        },
        VariableDeclaration(node, state) {
            transformVariableDeclaration(node, state);
        },
        Identifier(node, state) {
            transformIdentifier(node, state);
        },
        CallExpression(node, state) {
            transformCallExpression(node, state);
        },
        MemberExpression(node) {
            transformMemberExpression(node, originalParamName, scopeManager);
        },
        AssignmentExpression(node, state) {
            transformAssignmentExpression(node, state);
        },
        FunctionDeclaration(node, state) {
            // Skip transformation since we already handled it in the first pass
            return;
        },
        ForStatement(node, state, c) {
            transformForStatement(node, state, c);
        },
        IfStatement(node, state, c) {
            transformIfStatement(node, state, c);
        },
    });

    //transform equality checks to math.__eq calls
    transformEqualityChecks(ast);

    console.log(ast)

    const transformedCode = astring.generate(ast);

    const _wraperFunction = new Function('', `return ${transformedCode}`);
    return _wraperFunction(this);
}

// Add this new function before the transpile function
function transformEqualityChecks(ast: Program): void {
    walk.simple(ast, {
        BinaryExpression(node) {
            // Check if this is an equality operator
            if (node.operator === '==' || node.operator === '===') {
                // Store the original operands
                const leftOperand = node.left;
                const rightOperand = node.right;

                // Transform the BinaryExpression into a CallExpression
                Object.assign(node, {
                    type: 'CallExpression',
                    callee: {
                        type: 'MemberExpression',
                        object: {
                            type: 'Identifier',
                            name: '$.math',
                        },
                        property: {
                            type: 'Identifier',
                            name: '__eq',
                        },
                        computed: false,
                    },
                    arguments: [leftOperand, rightOperand],
                    _transformed: true,
                });
            }
        },
    });
}
