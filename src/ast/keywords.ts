// Reserved-keyword + framework-annotation whitelist. Without it, compound
// identifiers like `PackageManager` register `package` as a domain part and
// the Java `package` keyword gets pseudonymised on the next pass.

export const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
  'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
  'package', 'private', 'protected', 'public', 'return', 'short', 'static',
  'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
  'transient', 'try', 'void', 'volatile', 'while', 'true', 'false', 'null',
  'var', 'yield', 'record', 'sealed', 'permits', 'non-sealed',
]);

export const KOTLIN_KEYWORDS = new Set([
  'as', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun',
  'if', 'in', 'interface', 'is', 'null', 'object', 'package', 'return',
  'super', 'this', 'throw', 'true', 'try', 'typealias', 'typeof', 'val',
  'var', 'when', 'while', 'by', 'catch', 'constructor', 'delegate',
  'dynamic', 'field', 'file', 'finally', 'get', 'import', 'init', 'param',
  'property', 'receiver', 'set', 'setparam', 'value', 'where', 'abstract',
  'actual', 'annotation', 'companion', 'const', 'crossinline', 'data',
  'enum', 'expect', 'external', 'final', 'infix', 'inline', 'inner',
  'internal', 'lateinit', 'noinline', 'open', 'operator', 'out', 'override',
  'private', 'protected', 'public', 'reified', 'sealed', 'suspend', 'tailrec',
  'vararg',
]);

export const PYTHON_KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
  'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
  'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
  'match', 'case',
]);

export const TYPESCRIPT_KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false',
  'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new',
  'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try',
  'typeof', 'var', 'void', 'while', 'with', 'as', 'implements', 'interface',
  'let', 'package', 'private', 'protected', 'public', 'static', 'yield',
  'any', 'boolean', 'constructor', 'declare', 'get', 'module', 'require',
  'number', 'set', 'string', 'symbol', 'type', 'from', 'of', 'namespace',
  'async', 'await', 'abstract', 'readonly', 'keyof', 'infer', 'is',
  'asserts', 'override', 'satisfies', 'unknown', 'never',
]);

export const GO_KEYWORDS = new Set([
  'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
  'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface',
  'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type',
  'var', 'nil', 'true', 'false', 'iota',
]);

export const RUST_KEYWORDS = new Set([
  'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn',
  'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let',
  'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self',
  'Self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe',
  'use', 'where', 'while', 'abstract', 'become', 'box', 'do', 'final',
  'macro', 'override', 'priv', 'typeof', 'unsized', 'virtual', 'yield',
  'try', 'union',
]);

export const PHP_KEYWORDS = new Set([
  'abstract', 'and', 'array', 'as', 'break', 'callable', 'case', 'catch',
  'class', 'clone', 'const', 'continue', 'declare', 'default', 'do', 'echo',
  'else', 'elseif', 'empty', 'enddeclare', 'endfor', 'endforeach', 'endif',
  'endswitch', 'endwhile', 'enum', 'extends', 'final', 'finally', 'fn',
  'for', 'foreach', 'function', 'global', 'goto', 'if', 'implements',
  'include', 'include_once', 'instanceof', 'insteadof', 'interface', 'isset',
  'list', 'match', 'namespace', 'new', 'or', 'print', 'private', 'protected',
  'public', 'readonly', 'require', 'require_once', 'return', 'static',
  'switch', 'throw', 'trait', 'try', 'unset', 'use', 'var', 'while', 'xor',
  'yield', 'true', 'false', 'null', 'self', 'parent',
]);

export const CSHARP_KEYWORDS = new Set([
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char',
  'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate',
  'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false',
  'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit',
  'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace',
  'new', 'null', 'object', 'operator', 'out', 'override', 'params',
  'private', 'protected', 'public', 'readonly', 'ref', 'return', 'sbyte',
  'sealed', 'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct',
  'switch', 'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong',
  'unchecked', 'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile',
  'while', 'add', 'alias', 'ascending', 'async', 'await', 'by', 'descending',
  'dynamic', 'equals', 'from', 'get', 'global', 'group', 'init', 'into',
  'join', 'let', 'managed', 'nameof', 'nint', 'not', 'notnull', 'nuint',
  'on', 'orderby', 'partial', 'record', 'remove', 'required', 'select',
  'set', 'unmanaged', 'value', 'var', 'when', 'where', 'with', 'yield',
]);

export const JAVASCRIPT_KEYWORDS = TYPESCRIPT_KEYWORDS;

const LANG_KEYWORDS: Record<string, Set<string>> = {
  java: JAVA_KEYWORDS,
  kotlin: KOTLIN_KEYWORDS,
  python: PYTHON_KEYWORDS,
  typescript: TYPESCRIPT_KEYWORDS,
  tsx: TYPESCRIPT_KEYWORDS,
  javascript: JAVASCRIPT_KEYWORDS,
  go: GO_KEYWORDS,
  rust: RUST_KEYWORDS,
  php: PHP_KEYWORDS,
  csharp: CSHARP_KEYWORDS,
  c_sharp: CSHARP_KEYWORDS,
};

// Framework-specific class/attribute/annotation names that keep the code
// syntactically valid and semantically intact when a reader (LLM) sees them.
// Stripped to the bare annotation token. the `@` is part of the source, not
// the identifier we match against.
export const FRAMEWORK_ANNOTATIONS = new Set([
  // Spring / Spring-Boot
  'Service', 'Component', 'Controller', 'RestController', 'Repository',
  'Configuration', 'Bean', 'Autowired', 'Qualifier', 'Value', 'Primary',
  'Lazy', 'Profile', 'Scope', 'Order', 'DependsOn', 'ComponentScan',
  'EnableAutoConfiguration', 'SpringBootApplication', 'Import',
  'ConfigurationProperties', 'ConditionalOnProperty', 'ConditionalOnClass',
  'ConditionalOnMissingBean', 'RequestMapping', 'GetMapping', 'PostMapping',
  'PutMapping', 'DeleteMapping', 'PatchMapping', 'PathVariable',
  'RequestParam', 'RequestBody', 'RequestHeader', 'ResponseBody',
  'ResponseStatus', 'ExceptionHandler', 'ControllerAdvice',
  'RestControllerAdvice', 'CrossOrigin', 'Transactional', 'Async',
  'Scheduled', 'EventListener', 'PostConstruct', 'PreDestroy', 'Valid',
  'Validated', 'Cacheable', 'CacheEvict', 'CachePut',
  // JPA / Hibernate / Jakarta Persistence
  'Entity', 'Table', 'Column', 'Id', 'GeneratedValue', 'SequenceGenerator',
  'TableGenerator', 'Version', 'Embedded', 'Embeddable', 'EmbeddedId',
  'MappedSuperclass', 'Inheritance', 'DiscriminatorColumn',
  'DiscriminatorValue', 'ManyToOne', 'OneToMany', 'OneToOne', 'ManyToMany',
  'JoinColumn', 'JoinTable', 'JoinColumns', 'PrimaryKeyJoinColumn',
  'Temporal', 'Enumerated', 'Lob', 'Transient', 'Basic', 'Access',
  'OrderBy', 'OrderColumn', 'NamedQuery', 'NamedQueries', 'NamedNativeQuery',
  'Query', 'Modifying', 'Param', 'EntityGraph', 'Fetch', 'BatchSize',
  'Cache', 'CreationTimestamp', 'UpdateTimestamp', 'CreatedDate',
  'LastModifiedDate', 'CreatedBy', 'LastModifiedBy',
  // Lombok
  'Data', 'Value', 'Getter', 'Setter', 'ToString', 'EqualsAndHashCode',
  'AllArgsConstructor', 'NoArgsConstructor', 'RequiredArgsConstructor',
  'Builder', 'SuperBuilder', 'Slf4j', 'Log', 'Log4j', 'Log4j2',
  'CommonsLog', 'Synchronized', 'SneakyThrows', 'NonNull', 'Cleanup',
  'With', 'Accessors', 'FieldDefaults',
  // Bean Validation (javax / jakarta)
  'NotNull', 'NotBlank', 'NotEmpty', 'Size', 'Min', 'Max', 'Pattern',
  'Email', 'Past', 'Future', 'Positive', 'Negative', 'AssertTrue',
  'AssertFalse', 'Digits', 'DecimalMin', 'DecimalMax',
  // Quarkus / CDI / MicroProfile
  'ApplicationScoped', 'RequestScoped', 'SessionScoped', 'Dependent',
  'Singleton', 'Inject', 'Produces', 'Consumes', 'Named', 'Default',
  'Alternative', 'Interceptor', 'Decorator', 'Typed', 'Observes',
  'ConfigProperty', 'Path', 'GET', 'POST', 'PUT', 'DELETE', 'HEAD',
  'OPTIONS', 'Provider', 'Context',
  // Angular
  'NgModule', 'Component', 'Injectable', 'Directive', 'Pipe', 'Input',
  'Output', 'HostBinding', 'HostListener', 'ViewChild', 'ViewChildren',
  'ContentChild', 'ContentChildren',
  // NestJS
  'Module', 'Controller', 'Injectable', 'Get', 'Post', 'Put', 'Delete',
  'Patch', 'Options', 'Head', 'All', 'Body', 'Query', 'Param', 'Headers',
  'Session', 'Req', 'Res', 'Next', 'UseGuards', 'UseInterceptors',
  'UseFilters', 'UsePipes',
  // .NET / ASP.NET
  'ApiController', 'Route', 'HttpGet', 'HttpPost', 'HttpPut', 'HttpDelete',
  'HttpPatch', 'FromBody', 'FromQuery', 'FromRoute', 'FromHeader',
  'FromServices', 'FromForm', 'Required', 'StringLength', 'Range',
  'RegularExpression', 'MinLength', 'MaxLength', 'DataType', 'Display',
  'DisplayName', 'Key', 'ForeignKey', 'DatabaseGenerated', 'NotMapped',
  'Table', 'DataMember', 'DataContract', 'Serializable', 'XmlElement',
  'XmlAttribute', 'XmlRoot', 'JsonProperty', 'JsonIgnore',
  'JsonPropertyName', 'JsonConverter',
  // Python decorators (common)
  'property', 'staticmethod', 'classmethod', 'dataclass', 'pytest',
  'fixture', 'parametrize',
]);

// Public technology brand names. Unlike FRAMEWORK_ANNOTATIONS these are also
// preserved when they appear as SPLIT PARTS of a compound identifier. e.g.
// `KafkaTemplate` must stay `Kafka*` so the LLM keeps the Apache-Kafka mental
// model. Brands are public information; pseudonymizing them is both unneeded
// for privacy and actively harmful for code comprehension.
export const TECH_BRANDS = new Set([
  // Messaging / streaming
  'Kafka', 'RabbitMQ', 'Rabbit', 'ActiveMQ', 'Pulsar', 'NATS', 'ZeroMQ', 'Redis',
  // App / web frameworks
  'Spring', 'SpringBoot', 'Quarkus', 'Micronaut', 'Jakarta', 'Vertx',
  'Rails', 'Django', 'Flask', 'FastAPI', 'Express', 'Koa', 'NestJS', 'Next',
  // Databases
  'Postgres', 'Postgresql', 'Oracle', 'MySQL', 'MariaDB', 'SQLite', 'SQLServer',
  'MongoDB', 'Mongo', 'Cassandra', 'DynamoDB', 'CouchDB', 'Neo4j', 'InfluxDB',
  // Search / analytics
  'Elasticsearch', 'Elastic', 'Opensearch', 'Solr', 'Splunk',
  // Containers / orchestration / infra
  'Docker', 'Podman', 'Kubernetes', 'Kubectl', 'Helm', 'OpenShift', 'Rancher',
  'Istio', 'Linkerd',
  // CI / build
  'Maven', 'Gradle', 'Bazel', 'Jenkins', 'GitLab', 'GitHub', 'Bitbucket', 'Git',
  'CircleCI', 'TravisCI', 'TeamCity',
  // Config / IaC
  'Terraform', 'Ansible', 'Puppet', 'Chef', 'Vault', 'Consul', 'Etcd',
  // Observability
  'Prometheus', 'Grafana', 'Zipkin', 'Jaeger', 'OpenTelemetry', 'Datadog',
  'Kibana', 'Logstash', 'Fluentd', 'Sentry',
  // Runtimes / web servers
  'Nginx', 'Apache', 'Tomcat', 'Jetty', 'Undertow', 'Netty',
  // Serializers / libs
  'Jackson', 'Hibernate', 'Lombok', 'Slf4j', 'Logback', 'Log4j',
  // Tooling
  'Jira', 'Confluence', 'Bitwarden', 'Okta', 'Auth0', 'Keycloak',
  // Cloud
  'AWS', 'Azure', 'GCP', 'S3', 'EC2', 'RDS', 'SNS', 'SQS', 'Lambda', 'Firebase',
  'CloudWatch', 'CloudFront', 'CloudFormation',
  // Languages / platforms (as identifiers in naming)
  'Java', 'Javascript', 'Typescript', 'Python', 'Ruby', 'Rust', 'Golang',
]);

const REACT_HOOK_PREFIX_RE = /^use[A-Z]/;

// Brands that also match lowercase in compound identifiers (oracleClient,
// postgresClient). Short ambiguous names (next, git, vault, rails, express,
// elastic) are excluded.
const CASE_INSENSITIVE_BRANDS = new Set(
  [
    'Kafka', 'Spring', 'SpringBoot', 'Quarkus', 'Micronaut',
    'Postgres', 'Postgresql', 'Oracle', 'MongoDB', 'Mongo',
    'Cassandra', 'DynamoDB', 'SQLite', 'MySQL', 'MariaDB',
    'Redis', 'Elasticsearch', 'Opensearch',
    'Docker', 'Kubernetes', 'Terraform', 'Ansible',
    'Hibernate', 'Jackson', 'Lombok',
    'Angular', 'NestJS', 'Svelte',
    'Jenkins', 'GitLab', 'GitHub',
    'Nginx', 'Apache', 'Tomcat',
    'Confluence', 'Keycloak',
    'Prometheus', 'Grafana',
    'Camunda', 'Playwright', 'Selenium',
    'RabbitMQ', 'ActiveMQ',
  ].map((b) => b.toLowerCase()),
);

export function isTechBrand(token: string): boolean {
  return TECH_BRANDS.has(token);
}

/** Case-insensitive brand check for split-parts of compound identifiers. */
export function isTechBrandCaseInsensitive(token: string): boolean {
  if (!token) return false;
  return CASE_INSENSITIVE_BRANDS.has(token.toLowerCase());
}

export function isLanguageKeyword(token: string, lang?: string): boolean {
  if (!token) return false;
  if (lang) {
    const set = LANG_KEYWORDS[lang];
    if (set?.has(token)) return true;
    return false;
  }
  for (const set of Object.values(LANG_KEYWORDS)) {
    if (set.has(token)) return true;
  }
  return false;
}

export function isFrameworkAnnotation(token: string): boolean {
  if (!token) return false;
  if (FRAMEWORK_ANNOTATIONS.has(token)) return true;
  if (TECH_BRANDS.has(token)) return true;
  if (REACT_HOOK_PREFIX_RE.test(token)) return true;
  return false;
}

export function shouldPreserveIdentifier(token: string, lang?: string): boolean {
  return isLanguageKeyword(token, lang) || isFrameworkAnnotation(token);
}
