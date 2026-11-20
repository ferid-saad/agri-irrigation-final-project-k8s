#!/usr/bin/env bash
# =============================================================================
# Script de création des Secrets Kubernetes - Projet Agri Irrigation
# =============================================================================
# Usage : bash scripts/create-secrets.sh
#
# Ce script génère le Secret Kubernetes directement via kubectl
# sans jamais écrire les mots de passe en clair dans un fichier YAML.
# Les valeurs sont lues depuis des variables d'environnement ou saisies
# de façon interactive (sans echo dans le terminal).
# =============================================================================

set -euo pipefail

NAMESPACE="agri-irrigation"
SECRET_NAME="agri-secrets"

echo "=== Création du Secret Kubernetes : ${SECRET_NAME} ==="
echo "    Namespace : ${NAMESPACE}"
echo ""

# --- Lecture des secrets (variables d'env ou saisie interactive) ---

read_secret() {
  local VAR_NAME="$1"
  local PROMPT="$2"
  local VALUE="${!VAR_NAME:-}"
  if [ -z "$VALUE" ]; then
    echo -n "$PROMPT : "
    read -rs VALUE
    echo ""
  fi
  echo "$VALUE"
}

POSTGRES_USER=$(read_secret "POSTGRES_USER"       "Utilisateur PostgreSQL      ")
POSTGRES_PASSWORD=$(read_secret "POSTGRES_PASSWORD"   "Mot de passe PostgreSQL     ")
JWT_SECRET=$(read_secret "JWT_SECRET"          "JWT Secret (min 32 chars)   ")
MONGO_USER=$(read_secret "MONGO_USER"          "Utilisateur MongoDB         ")
MONGO_PASSWORD=$(read_secret "MONGO_PASSWORD"      "Mot de passe MongoDB        ")

# --- Validation ---
if [ ${#JWT_SECRET} -lt 32 ]; then
  echo "ERREUR : JWT_SECRET doit faire au moins 32 caractères !" >&2
  exit 1
fi

# --- Suppression de l'ancien secret s'il existe ---
kubectl delete secret "${SECRET_NAME}" -n "${NAMESPACE}" --ignore-not-found

# --- Création du Secret via kubectl (jamais écrit sur le disque) ---
kubectl create secret generic "${SECRET_NAME}" \
  --namespace="${NAMESPACE}" \
  --from-literal=postgres-user="${POSTGRES_USER}" \
  --from-literal=postgres-password="${POSTGRES_PASSWORD}" \
  --from-literal=jwt-secret="${JWT_SECRET}" \
  --from-literal=mongo-user="${MONGO_USER}" \
  --from-literal=mongo-password="${MONGO_PASSWORD}"

echo ""
echo "✅  Secret '${SECRET_NAME}' créé avec succès dans le namespace '${NAMESPACE}'"
echo ""
echo "Pour vérifier (sans afficher les valeurs) :"
echo "  kubectl get secret ${SECRET_NAME} -n ${NAMESPACE}"
echo "  kubectl describe secret ${SECRET_NAME} -n ${NAMESPACE}"
