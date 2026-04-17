import type { QueryDef } from './typescript.js';

export const JAVA_QUERIES: QueryDef[] = [
  { kind: 'class', pattern: '(class_declaration name: (identifier) @name)' },
  { kind: 'interface', pattern: '(interface_declaration name: (identifier) @name)' },
  { kind: 'enum', pattern: '(enum_declaration name: (identifier) @name)' },
  { kind: 'method', pattern: '(method_declaration name: (identifier) @name)' },
  { kind: 'variable', pattern: '(variable_declarator name: (identifier) @name)' },
  { kind: 'function', pattern: '(constructor_declaration name: (identifier) @name)' },
  // type references in field declarations, locals, params, casts, generics.
  // Needed so `FooRepository` inside `private final FooRepository foo;` is
  // pseudonymized consistently with the class declaration elsewhere, and so
  // an `import com.acme.FooService;` cascade lands on the matching pseudo.
  { kind: 'type', pattern: '(type_identifier) @name' },
  // Formal parameters are only covered in high mode. domain-term leakage
  // through a parameter name like `subscriptionEvent` is rare enough that
  // medium-mode users shouldn't pay the readability cost.
  { kind: 'parameter', pattern: '(formal_parameter name: (identifier) @name)', mode: 'high' },
];
