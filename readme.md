# @wssz/di
DI (dependency injection) lib. No external dependencies, cross-env with optional decorator API.

## Examples

### Service testing/mocking

```typescript
@injectable(Lifetime.SINGLETON)
class Db {
  get(key: string) {
    // some db adapter
  }
}

@injectable()
class Service {
  db = inject(DB)

  userById(id: string) {
    return this.db.get(id)
  }
}

const module = extendModule([
  {
    token: Db,
    useFactory: () => ({
      get() {
        return {
          id: '123',
          name: 'John'
        }
      }
    })
  }
])

const mockedServiceInstance = module.resolve(Service)
mockedServiceInstance.userById('any key') // -> { id: '123', name: 'John' }
```
