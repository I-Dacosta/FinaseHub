#!/bin/bash

# Function App Health Check Script
FUNCTION_APP_URL="https://func-vh-b76k2jz5hzgzi.azurewebsites.net"

echo "🔍 Testing FinanseHub Function App Deployment"
echo "============================================="
echo ""
echo "Function App URL: $FUNCTION_APP_URL"
echo ""

# Test endpoints with timeout and retries
test_endpoint() {
    local endpoint=$1
    local description=$2
    local max_attempts=3
    local timeout=30
    
    echo "🌐 Testing $description..."
    echo "   Endpoint: $FUNCTION_APP_URL$endpoint"
    
    for attempt in $(seq 1 $max_attempts); do
        echo "   Attempt $attempt/$max_attempts..."
        
        response=$(curl -s -w "%{http_code}" --max-time $timeout "$FUNCTION_APP_URL$endpoint" 2>/dev/null)
        http_code="${response: -3}"
        body="${response%???}"
        
        if [ "$http_code" = "200" ]; then
            echo "   ✅ SUCCESS (HTTP $http_code)"
            if [ ${#body} -gt 100 ]; then
                echo "   📊 Response: ${body:0:100}..."
            else
                echo "   📊 Response: $body"
            fi
            echo ""
            return 0
        elif [ "$http_code" = "404" ]; then
            echo "   ⚠️  NOT FOUND (HTTP $http_code) - Function may not be deployed"
        elif [ "$http_code" = "500" ]; then
            echo "   ❌ SERVER ERROR (HTTP $http_code)"
            echo "   📊 Error: $body"
        elif [ -z "$http_code" ]; then
            echo "   ⏳ TIMEOUT - Function may be cold starting..."
        else
            echo "   ⚠️  HTTP $http_code: $body"
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            echo "   ⏳ Waiting 10 seconds before retry..."
            sleep 10
        fi
    done
    
    echo "   ❌ FAILED after $max_attempts attempts"
    echo ""
    return 1
}

# Test all endpoints
echo "🧪 Testing API Endpoints"
echo "========================"
echo ""

# Basic health check endpoints
test_endpoint "/api/monitoring" "Monitoring endpoint"
test_endpoint "/api/data/summary" "Data summary endpoint"

# Data endpoints
test_endpoint "/api/data/currency" "Currency data endpoint"
test_endpoint "/api/data/series" "Interest rates endpoint"

# Admin endpoints
test_endpoint "/api/manualSync" "Manual sync endpoint"

echo "🎯 Summary"
echo "=========="
echo ""
echo "If endpoints are not responding:"
echo "1. Function app may still be warming up (can take 5-10 minutes)"
echo "2. Check Azure Portal → Function App → Functions to see if functions are deployed"
echo "3. Check Azure Portal → Function App → Log Stream for any errors"
echo "4. Verify database connection string is correct"
echo ""
echo "🔗 Useful Links:"
echo "- Function App: https://portal.azure.com/#resource/subscriptions/YOUR_SUB/resourceGroups/rg-Valutahub/providers/Microsoft.Web/sites/func-vh-b76k2jz5hzgzi"
echo "- Key Vault: https://portal.azure.com/#resource/subscriptions/YOUR_SUB/resourceGroups/rg-Valutahub/providers/Microsoft.KeyVault/vaults/kv-vh-b76k2jz5hzgzi"
echo ""
echo "🇳🇴 Norwegian views ready for Power BI:"
echo "- Valutakurser (Currency rates)"
echo "- Renter (Interest rates)"
echo "- SisteKurser (Latest currency rates)"
echo "- SisteRenter (Latest interest rates)"
echo "- DataSammendrag (Data summary)"
echo ""
echo "📋 Next step: Follow DEPLOYMENT_COMPLETE_GUIDE.md for Power BI setup"
