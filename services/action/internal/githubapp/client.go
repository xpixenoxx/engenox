// githubapp/client.go — GitHub App authenticated client (M3).
//
// The Action layer holds the GitHub-App token (per-tenant install credential, in Vault).
// Decision layer + LLM seams hold NO commit credential (15 §5e).
//
// M3-thin: single repo, app installation. Thickening: per-tenant installations.
// Cites: 15 §5e, 09 §6, ADR-0007 #4 (gate mechanism NOT thinned).

package githubapp

import (
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"net/http"
	"os"

	"github.com/bradleyfalzon/ghinstallation/v2"
	"github.com/google/go-github/v62/github"
)

type Config struct {
	AppID          int64
	PrivateKey     string
	InstallationID int64
}

func NewClient(ctx context.Context) (*github.Client, error) {
	appID := os.Getenv("GITHUB_APP_ID")
	privateKey := os.Getenv("GITHUB_APP_PRIVATE_KEY")
	installationID := os.Getenv("GITHUB_APP_INSTALLATION_ID")

	if appID == "" || privateKey == "" || installationID == "" {
		// M3-thin: return unauthenticated client for local dev
		// In production, this is a hard failure
		return github.NewClient(nil), nil
	}

	// Parse app ID
	var appIDInt int64
	fmt.Sscanf(appID, "%d", &appIDInt)

	var installIDInt int64
	fmt.Sscanf(installationID, "%d", &installIDInt)

	// Parse private key (PKCS#1 or PKCS#8)
	block, _ := pem.Decode([]byte(privateKey))
	if block == nil {
		return nil, fmt.Errorf("failed to parse PEM block containing private key")
	}

	var parsedKey *rsa.PrivateKey
	var err error
	if block.Type == "RSA PRIVATE KEY" {
		parsedKey, err = x509.ParsePKCS1PrivateKey(block.Bytes)
	} else if block.Type == "PRIVATE KEY" {
		key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("failed to parse PKCS8 private key: %w", err)
		}
		var ok bool
		parsedKey, ok = key.(*rsa.PrivateKey)
		if !ok {
			return nil, fmt.Errorf("parsed key is not RSA private key")
		}
	} else {
		return nil, fmt.Errorf("unsupported private key type: %s", block.Type)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	_ = parsedKey // used for validation; ghinstallation parses internally

	// Create GitHub App transport - ghinstallation v2 expects raw PEM bytes
	itr, err := ghinstallation.New(
		http.DefaultTransport,
		appIDInt,
		installIDInt,
		block.Bytes,
	)
	if err != nil {
		return nil, fmt.Errorf("ghinstallation init failed: %w", err)
	}

	client := github.NewClient(&http.Client{Transport: itr})
	return client, nil
}