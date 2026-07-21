import database
import models
import auth

def run_test():
    print("Initializing Database tables (creating users and updating lectures)...")
    models.Base.metadata.create_all(bind=database.engine)
    print("Database tables initialized successfully!")

    print("\nTesting Password Hashing...")
    password = "MySecurePassword123"
    hashed = auth.hash_password(password)
    print(f"Hashed password: {hashed}")
    
    is_valid = auth.verify_password(password, hashed)
    print(f"Password verification match: {is_valid}")
    assert is_valid == True, "Password verification failed"
    
    is_invalid = auth.verify_password("wrong_password", hashed)
    print(f"Password verification mismatch: {is_invalid}")
    assert is_invalid == False, "Password verification matched incorrect password"
    
    print("\nTesting JWT Token generation...")
    token = auth.create_access_token("test-user-id-12345")
    print(f"Generated Token: {token[:30]}...")
    
    print("\nTesting JWT verification...")
    import jwt
    payload = jwt.decode(token, auth.JWT_SECRET, algorithms=[auth.JWT_ALGORITHM])
    print(f"Decoded payload: {payload}")
    assert payload.get("sub") == "test-user-id-12345", "Subject mismatch in token payload"
    
    print("\nAll Auth system tests passed successfully!")

if __name__ == "__main__":
    run_test()
