module github.com/engenox/perception

go 1.25.0

require (
	connectrpc.com/connect v1.20.0
	github.com/engenox/contracts v0.0.0
	github.com/engenox/kg v0.0.0
	google.golang.org/grpc v1.68.0
	google.golang.org/protobuf v1.36.11
)

require (
	golang.org/x/net v0.29.0 // indirect
	golang.org/x/sys v0.25.0 // indirect
	golang.org/x/text v0.18.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20240903143218-8af14fe29dc1 // indirect
)

replace (
	github.com/engenox/contracts => ../../pkg/contracts
	github.com/engenox/kg => ../../libs/kg/go
)
