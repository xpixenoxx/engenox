// cmd/main.go — PerceptionService gRPC server entry point (T14 exemplar).
//
// The perception layer runs the probe fleet: fan-out queries to AI surfaces,
// fan-in answers through the gateway Extract seam, write SurfaceAssertion nodes
// to the truth spine via libs/kg. This is the ONLY service that touches the
// gateway Extract seam directly (CLAUDE.md §5: gateway is leaf-only).
//
// Cites: 11 §2/§3 (perception responsibilities + seams), 13 §2 (KG write path),
//        24 §3 (services called via generated gRPC client), ADR-0007 M3-thin.

package main

import (
	"context"
	"flag"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	"github.com/engenox/contracts/generated/go/engenox/service/v1"
	"github.com/engenox/perception/internal/server"
)

func main() {
	addr := flag.String("addr", ":9090", "gRPC listen address")
	flag.Parse()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	lis, err := net.Listen("tcp", *addr)
	if err != nil {
		log.Printf("failed to listen: %v", err)
		stop()
		os.Exit(1)
	}

	srv := server.New()
	grpcServer := grpc.NewServer()
	servicev1.RegisterPerceptionServiceServer(grpcServer, srv)
	reflection.Register(grpcServer)

	go func() {
		log.Printf("PerceptionService listening on %s", *addr)
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("gRPC serve failed: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down...")
	grpcServer.GracefulStop()
	log.Println("Stopped")
}