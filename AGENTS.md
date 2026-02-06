# Copilot Instructions — Clean Architecture & Best Practices

## Architecture

Follow Clean Architecture principles. Organize the codebase into well-defined layers with clear boundaries and dependency rules:

```
src/
├── domain/        # Enterprise business rules (models, use cases, errors)
├── data/          # Application business rules (protocols, remote implementations)
├── infra/         # Frameworks & drivers (HTTP clients, cache adapters)
├── presentation/  # UI layer (React components, hooks, pages, styles)
├── validation/    # Input validation logic (validators, protocols, errors)
└── main/          # Composition root (factories, routes, adapters, decorators)
```

### Layer Dependency Rule
Dependencies MUST point inward. Outer layers depend on inner layers, never the reverse:
- `domain` depends on nothing
- `data` depends on `domain`
- `infra` depends on `data`
- `presentation` depends on `domain`
- `validation` depends on `presentation` protocols
- `main` depends on everything (composition root)

### Domain Layer
- Define models as TypeScript `type` aliases
- Define use cases as `interface` with a single method and a companion `namespace` for `Params` and `Model` types
- Define domain-specific error classes extending `Error`
- Keep this layer free from framework dependencies

### Data Layer
- Define protocols (interfaces) for external dependencies: `HttpClient`, `SetStorage`, `GetStorage`
- Implement remote use cases (e.g., `RemoteAuthentication`) that depend on protocols, not concrete implementations
- Map HTTP status codes to domain errors using `switch` statements
- Use a `namespace` per remote use case to scope its `Model` type

### Infrastructure Layer
- Implement data protocols with concrete technologies (e.g., `AxiosHttpClient` implements `HttpClient`, `LocalStorageAdapter` implements `SetStorage` and `GetStorage`)
- Wrap third-party libraries behind protocol interfaces to keep them replaceable

### Presentation Layer
- Use React Functional Components exclusively
- Leverage hooks: `useState`, `useEffect`, `useRef`, `useParams`, `useHistory`, and custom hooks
- Receive dependencies (validation, use cases) via props — never instantiate them directly
- Manage form state with state management atoms (Recoil or equivalent)
- Implement reusable UI components: `PrivateRoute`, `Error`, `Header`, `Footer`, `Input`, `SubmitButton`, `FormStatus`
- Protect routes with a `PrivateRoute` component that checks authentication state

### Validation Layer
- Define a `FieldValidation` protocol with `field` and `validate` properties
- Create single-purpose validators: `RequiredFieldValidation`, `EmailValidation`, `MinLengthValidation`, `CompareFieldsValidation`
- Compose validators with `ValidationComposite` using `Composite` pattern
- Build validation chains fluently with `ValidationBuilder` using `Builder` pattern

### Main Layer (Composition Root)
- Wire all dependencies using Factory functions (e.g., `makeLogin`, `makeRemoteAuthentication`, `makeLoginValidation`)
- Use the `Decorator` pattern for cross-cutting concerns (e.g., `AuthorizeHttpClientDecorator` to inject auth tokens)
- Configure routes and global state initialization here
- Load environment-specific configuration (e.g., API URLs from `process.env`)

## SOLID Principles

- **SRP**: Each class/function has a single reason to change
- **OCP**: Extend behavior through composition and decorators, not by modifying existing code
- **LSP**: Implementations are substitutable for their interfaces
- **ISP**: Define small, focused interfaces (e.g., `SetStorage` and `GetStorage` are separate)
- **DIP**: Depend on abstractions (interfaces/protocols), not concrete implementations

## Design Patterns

- **Factory**: Create instances with `make*` functions in the composition root
- **Adapter**: Wrap external libraries behind protocol interfaces (`AxiosHttpClient`, `LocalStorageAdapter`)
- **Composite**: Combine multiple validators into `ValidationComposite`
- **Decorator**: Add behavior transparently (`AuthorizeHttpClientDecorator`)
- **Builder**: Construct validation chains with `ValidationBuilder`
- **Dependency Injection**: Pass dependencies through constructors and component props
- **Proxy**: Protect routes with `PrivateRoute`

## Testing

- Follow TDD methodology: write tests before implementation
- Write unit tests for every layer using the SUT (System Under Test) pattern with `makeSut` factories
- Use test doubles: Spies, Mocks, Stubs, Fakes, and Dummies
- Name test files with `.spec.ts` or `.spec.tsx` suffix, co-located with the source file
- Use descriptive `describe` and `it` blocks: `it('should ...')`
- Keep test helpers and mocks in a `test/` subfolder within each layer
- Generate fake data with faker libraries rather than hardcoding test values
- Aim for high test coverage across all layers
- Write integration tests for composed behavior and E2E tests for critical user flows

## Code Style

- Use TypeScript with strict typing
- Prefer `type` aliases for data structures and `interface` for contracts/protocols
- Use `namespace` to scope related types within a module
- Use path aliases (e.g., `@/domain`, `@/data`) for clean imports
- Group imports: external libraries first, then internal modules by layer
- Prefer composition over inheritance
- Keep functions small and focused on a single task
- Use meaningful, intention-revealing names for variables, functions, and classes
- Prefer fewer function arguments (ideally two or three at most)
- Handle errors with custom Error classes rather than error codes
- Do not hardcode sensitive information — use environment variables
- Export modules through barrel `index.ts` files for clean public APIs
- Use `memo` for React components that benefit from memoization
