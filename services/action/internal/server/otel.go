// server/otel.go — OpenTelemetry interceptors for gRPC.
package server

import (
	"context"
	"strings"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

const tracerName = "github.com/engenox/services/action"

func OTelUnaryInterceptor() grpc.UnaryServerInterceptor {
	tracer := otel.Tracer(tracerName)
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		ctx, span := tracer.Start(ctx, info.FullMethod, trace.WithAttributes(
			attribute.String("rpc.system", "grpc"),
			attribute.String("rpc.method", info.FullMethod),
		))
		defer span.End()

		// Propagate trace context via metadata
		md, ok := metadata.FromIncomingContext(ctx)
		if ok && len(md) > 0 {
			// Convert metadata to string representation
			var keys []string
			for k := range md {
				keys = append(keys, k)
			}
			span.SetAttributes(attribute.String("grpc.metadata.keys", strings.Join(keys, ",")))
		}

		resp, err := handler(ctx, req)
		if err != nil {
			span.RecordError(err)
		}
		return resp, err
	}
}

func OTelStreamInterceptor() grpc.StreamServerInterceptor {
	tracer := otel.Tracer(tracerName)
	return func(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
		ctx := ss.Context()
		ctx, span := tracer.Start(ctx, info.FullMethod, trace.WithAttributes(
			attribute.String("rpc.system", "grpc"),
			attribute.String("rpc.method", info.FullMethod),
		))
		defer span.End()

		wrapped := &wrappedServerStream{ServerStream: ss, ctx: ctx}
		return handler(srv, wrapped)
	}
}

type wrappedServerStream struct {
	grpc.ServerStream
	ctx context.Context
}

func (w *wrappedServerStream) Context() context.Context {
	return w.ctx
}