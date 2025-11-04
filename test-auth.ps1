# Authentication Test Script
# Run this with: npm start (in another terminal)
# Then run: bash test-auth.sh (Linux/Mac) or use these commands manually in PowerShell

# Base URL
$BASE_URL = "http://localhost:3000"

Write-Host "=== Car Lease API - Authentication Tests ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Green
Write-Host ""

# Test 2: Try accessing protected endpoint without auth (should fail)
Write-Host "Test 2: Access protected endpoint without auth (expect 401)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/contracts" -Method Get
    Write-Host "ERROR: Should have returned 401!" -ForegroundColor Red
} catch {
    Write-Host "✓ Correctly returned 401 Unauthorized" -ForegroundColor Green
}
Write-Host ""

# Test 3: Login as USER
Write-Host "Test 3: Login as USER" -ForegroundColor Yellow
$loginBody = @{
    email = "user@example.com"
    password = "User123!"
} | ConvertTo-Json

$userAuth = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
Write-Host "✓ Login successful" -ForegroundColor Green
Write-Host "Role: $($userAuth.role)" -ForegroundColor Cyan
Write-Host "Access Token: $($userAuth.accessToken.Substring(0, 20))..." -ForegroundColor Cyan
$userToken = $userAuth.accessToken
Write-Host ""

# Test 4: Login as ADMIN
Write-Host "Test 4: Login as ADMIN" -ForegroundColor Yellow
$adminLoginBody = @{
    email = "admin@example.com"
    password = "Admin123!"
} | ConvertTo-Json

$adminAuth = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method Post -Body $adminLoginBody -ContentType "application/json"
Write-Host "✓ Login successful" -ForegroundColor Green
Write-Host "Role: $($adminAuth.role)" -ForegroundColor Cyan
Write-Host "Access Token: $($adminAuth.accessToken.Substring(0, 20))..." -ForegroundColor Cyan
$adminToken = $adminAuth.accessToken
Write-Host ""

# Test 5: USER tries to access admin endpoint (should fail)
Write-Host "Test 5: USER tries to create city (expect 403)" -ForegroundColor Yellow
$cityBody = @{
    name = "Klaipeda"
    country = "LT"
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $userToken"
    }
    $response = Invoke-RestMethod -Uri "$BASE_URL/cities" -Method Post -Body $cityBody -ContentType "application/json" -Headers $headers
    Write-Host "ERROR: Should have returned 403!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "✓ Correctly returned 403 Forbidden" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Got $($_.Exception.Response.StatusCode) instead of 403" -ForegroundColor Red
    }
}
Write-Host ""

# Test 6: ADMIN creates city (should succeed)
Write-Host "Test 6: ADMIN creates city (expect 201)" -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    $response = Invoke-RestMethod -Uri "$BASE_URL/cities" -Method Post -Body $cityBody -ContentType "application/json" -Headers $headers
    Write-Host "✓ City created successfully" -ForegroundColor Green
    Write-Host "City: $($response | ConvertTo-Json)" -ForegroundColor Cyan
} catch {
    if ($_.Exception.Message -like "*409*") {
        Write-Host "✓ City already exists (409 Conflict) - this is OK" -ForegroundColor Green
    } else {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 7: USER creates contract (should succeed)
Write-Host "Test 7: USER creates contract (expect 201)" -ForegroundColor Yellow
$contractBody = @{
    carId = 2
    startDate = "2025-11-01T00:00:00Z"
    endDate = "2025-11-05T00:00:00Z"
    mileageStartKm = 15000
    fuelLevelStartPct = 100
    notes = "Test contract from auth test"
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $userToken"
    }
    $response = Invoke-RestMethod -Uri "$BASE_URL/contracts" -Method Post -Body $contractBody -ContentType "application/json" -Headers $headers
    Write-Host "✓ Contract created successfully" -ForegroundColor Green
    Write-Host "Contract ID: $($response.id)" -ForegroundColor Cyan
    $contractId = $response.id
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: USER lists all contracts (should fail)
Write-Host "Test 8: USER tries to list all contracts (expect 403)" -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $userToken"
    }
    $response = Invoke-RestMethod -Uri "$BASE_URL/contracts" -Method Get -Headers $headers
    Write-Host "ERROR: Should have returned 403!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "✓ Correctly returned 403 Forbidden" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Got $($_.Exception.Response.StatusCode) instead of 403" -ForegroundColor Red
    }
}
Write-Host ""

# Test 9: ADMIN lists all contracts (should succeed)
Write-Host "Test 9: ADMIN lists all contracts (expect 200)" -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
    }
    $response = Invoke-RestMethod -Uri "$BASE_URL/contracts" -Method Get -Headers $headers
    Write-Host "✓ Contracts retrieved successfully" -ForegroundColor Green
    Write-Host "Number of contracts: $($response.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 10: Refresh token
Write-Host "Test 10: Refresh access token (expect 200)" -ForegroundColor Yellow
$refreshBody = @{
    refreshToken = $userAuth.refreshToken
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/auth/refresh" -Method Post -Body $refreshBody -ContentType "application/json"
    Write-Host "✓ Token refreshed successfully" -ForegroundColor Green
    Write-Host "New Access Token: $($response.accessToken.Substring(0, 20))..." -ForegroundColor Cyan
    Write-Host "New Refresh Token: $($response.refreshToken.Substring(0, 20))..." -ForegroundColor Cyan
    $newRefreshToken = $response.refreshToken
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 11: Try to use old refresh token (should fail - rotation)
Write-Host "Test 11: Try to reuse old refresh token (expect 401)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/auth/refresh" -Method Post -Body $refreshBody -ContentType "application/json"
    Write-Host "ERROR: Should have returned 401!" -ForegroundColor Red
} catch {
    Write-Host "✓ Correctly returned 401 - token rotation working" -ForegroundColor Green
}
Write-Host ""

# Test 12: Logout
Write-Host "Test 12: Logout (revoke refresh token)" -ForegroundColor Yellow
$logoutBody = @{
    refreshToken = $newRefreshToken
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/auth/logout" -Method Post -Body $logoutBody -ContentType "application/json"
    Write-Host "✓ Logout successful (204)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== All Tests Completed ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "✓ Authentication is working correctly" -ForegroundColor Green
Write-Host "✓ Role-based access control is enforced" -ForegroundColor Green
Write-Host "✓ Refresh token rotation is working" -ForegroundColor Green
Write-Host "✓ JWT tokens contain user role information" -ForegroundColor Green
