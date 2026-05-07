import bcrypt

pw = "admin123"  
hash_pw = bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
print(hash_pw)