#!/usr/bin/env bash
# =============================================================================
# Script de déploiement complet - Projet Agri Irrigation
# =============================================================================
# Usage : bash scripts/deploy.sh [--dry-run]
#
# ORDRE DE DÉPLOIEMENT :
#  1. Namespace
#  2. Secrets (via create-secrets.sh - jamais commités)
#  3. ConfigMaps
#  4. RBAC (ServiceAccounts, Roles, RoleBindings)
#  5. PersistentVolumeClaims
#  6. Bases de données (Postgres, MongoDB)
#  7. Services applicatifs
#  8. Frontend
#  9. Ingress, NetworkPolicies, PDB, HPA
# =============================================================================

set -euo pipefail

KUBECTL="kubectl"
DRY_RUN=""
K8S_DIR="$(cd "$(dirname "$0")/../k8s" && pwd)"

if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN="--dry-run=client"
  echo "⚠️  Mode DRY-RUN activé (aucune ressource ne sera créée)"
fi

apply() {
  echo "  → Applying $1"
  ${KUBECTL} apply -f "$1" ${DRY_RUN}
}

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Déploiement Agri Irrigation sur Kubernetes ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# 1. Namespace
echo "▶ [1/8] Namespace"
apply "${K8S_DIR}/namespace.yaml"

# 2. Secrets - via script dédié (jamais commités avec de vraies valeurs)
echo ""
echo "▶ [2/8] Secrets"
if [ -z "$DRY_RUN" ]; then
  bash "$(dirname "$0")/create-secrets.sh"
else
  echo "  → [DRY-RUN] Skipping secret creation (run create-secrets.sh separately)"
fi

# 3. ConfigMaps
echo ""
echo "▶ [3/9] ConfigMaps"
apply "${K8S_DIR}/configmap.yaml"
apply "${K8S_DIR}/postgres/init-configmap.yaml"

# 4. RBAC : ServiceAccounts, Roles, RoleBindings
echo ""
echo "▶ [4/9] RBAC (ServiceAccounts / Roles / RoleBindings)"
apply "${K8S_DIR}/rbac.yaml"

# 5. PersistentVolumeClaims
echo ""
echo "▶ [5/9] PersistentVolumeClaims"
apply "${K8S_DIR}/postgres/pvc.yaml"
apply "${K8S_DIR}/mongodb/pvc.yaml"

# 6. Bases de données
echo ""
echo "▶ [6/9] Bases de données"
apply "${K8S_DIR}/postgres/deployment.yaml"
apply "${K8S_DIR}/postgres/service.yaml"
apply "${K8S_DIR}/mongodb/deployment.yaml"
apply "${K8S_DIR}/mongodb/service.yaml"

echo "  ⏳ Attente que Postgres soit prêt..."
[ -z "$DRY_RUN" ] && ${KUBECTL} rollout status deployment/postgres -n agri-irrigation --timeout=120s
echo "  ⏳ Attente que MongoDB soit prêt..."
[ -z "$DRY_RUN" ] && ${KUBECTL} rollout status deployment/mongodb  -n agri-irrigation --timeout=120s

# 7. Services applicatifs
echo ""
echo "▶ [7/9] Services applicatifs"
apply "${K8S_DIR}/auth-service/deployment.yaml"
apply "${K8S_DIR}/auth-service/service.yaml"
apply "${K8S_DIR}/auth-service/hpa.yaml"
apply "${K8S_DIR}/irrigation-service/deployment.yaml"
apply "${K8S_DIR}/irrigation-service/service.yaml"
apply "${K8S_DIR}/irrigation-service/hpa.yaml"
apply "${K8S_DIR}/notification-service/deployment.yaml"
apply "${K8S_DIR}/notification-service/service.yaml"
apply "${K8S_DIR}/notification-service/hpa.yaml"

# 8. Frontend
echo ""
echo "▶ [8/9] Frontend"
apply "${K8S_DIR}/frontend/deployment.yaml"
apply "${K8S_DIR}/frontend/service.yaml"
apply "${K8S_DIR}/frontend/hpa.yaml"

# 9. Network, Ingress, PDB
echo ""
echo "▶ [9/9] Network / Ingress / PDB"
apply "${K8S_DIR}/network-policy.yaml"
apply "${K8S_DIR}/ingress.yaml"
apply "${K8S_DIR}/pdb.yaml"

echo ""
echo "✅  Déploiement terminé !"
echo ""
echo "Vérification :"
echo "  kubectl get all -n agri-irrigation"
echo "  kubectl get secret agri-secrets -n agri-irrigation"
echo "  kubectl get networkpolicies -n agri-irrigation"
echo "  kubectl get serviceaccounts -n agri-irrigation"
echo "  kubectl get roles,rolebindings -n agri-irrigation"
