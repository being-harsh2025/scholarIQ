def test_user_registration(client):
    payload = {
        "email": "fresh_user@edupredict.ai",
        "password": "SecurePassword123!",
        "full_name": "Fresh Researcher",
        "role": "teacher"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == payload["email"]
    assert data["full_name"] == payload["full_name"]
    assert "id" in data
    assert "hashed_password" not in data

def test_duplicate_registration_fails(client):
    payload = {
        "email": "duplicate_user@edupredict.ai",
        "password": "SecurePassword123!",
        "full_name": "Duplicate User",
        "role": "teacher"
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 200

    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"].lower()

def test_login_success_and_failure(client, test_teacher):
    # Invalid password
    bad_login = client.post("/api/auth/login", json={
        "email": test_teacher.email,
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401

    # Valid login
    good_login = client.post("/api/auth/login", json={
        "email": test_teacher.email,
        "password": "TeacherTestPass123!"
    })
    assert good_login.status_code == 200
    data = good_login.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == test_teacher.email

def test_auth_me_protected(client, teacher_auth_headers, test_teacher):
    res = client.get("/api/auth/me", headers=teacher_auth_headers)
    assert res.status_code == 200
    assert res.json()["id"] == test_teacher.id

def test_rbac_restriction(client, student_auth_headers):
    # Student attempts to trigger model training -> must get 403 Forbidden
    payload = {
        "dataset_id": 1,
        "name": "Unauthorized Model",
        "algorithm": "LinearRegression",
        "target_column": "final_score",
        "selected_features": ["attendance_percentage"],
        "test_size": 0.2,
        "random_seed": 42
    }
    res = client.post("/api/models/train-regression", json=payload, headers=student_auth_headers)
    assert res.status_code == 403
