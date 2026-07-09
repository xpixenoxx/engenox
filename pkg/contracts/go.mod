// The contract package's Go module (24 §6). Generated Go (via `buf generate`) lands in
// generated/go/ and compiles within this module. The service + entity + event + policy
// generated packages are imported by the Go services (perception, action) via this
// module path: `github.com/engenox/contracts/generated/go/engenox/<ns>/v1`.
//
// `go mod tidy` (after `buf generate`) populates the require block from the generated
// imports (google.golang.org/protobuf + google.golang.org/grpc for the service stubs).
// The module is added to the workspace go.work by T11.
//
// Cites: 24 §6 (generated-artifact discipline); ADR-0001 (the Go stack pin); T02.

module github.com/engenox/contracts

go 1.24

require (
	google.golang.org/grpc v1.68.0
	google.golang.org/protobuf v1.36.11
)

require (
	golang.org/x/net v0.29.0 // indirect
	golang.org/x/sys v0.25.0 // indirect
	golang.org/x/text v0.18.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20240903143218-8af14fe29dc1 // indirect
)
