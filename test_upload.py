import requests

with open('dummy.jpg', 'wb') as f:
    f.write(b'this is a dummy image')

url = "http://localhost:8000/api/auth/me/"
headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzc0NjgxMzY3LCJpYXQiOjE3NzQ2Nzc3NjcsImp0aSI6IjYyMGJhZTQ1NTkwMzRiM2JhYjhjYjM4MjIwOWUzMWY2IiwidXNlcl9pZCI6IjYwMWIxOGIxLWRhNWYtNDk3NS1iMjVkLTk0NTAwOWY4NGYwYyJ9.yTfNI8dBltkwbstIcuAbHvcI3Tu4hasOKE5QCYnyXmc"}
files = {'profile_picture': open('dummy.jpg', 'rb')}

response = requests.patch(url, headers=headers, files=files)
print(response.status_code, response.text)
