# Tài liệu học Docker và CI/CD

Chỉ liệt kê nguồn đã kiểm tra tồn tại. Khóa Coursera bên dưới bằng tiếng Anh, có thể cần gói Coursera Plus hoặc học thử/audit tùy khóa. Chưa tìm được playlist tiếng Việt đáng tin để dẫn link trực tiếp, nên phần YouTube tiếng Việt dùng từ khóa tìm kiếm.

## Thứ tự học đề xuất

1. Docker cơ bản: image, container, Dockerfile, volume, network
2. Docker Compose: chạy nhiều container cùng lúc
3. GitHub Actions: workflow, job, step, trigger, secrets
4. Ghép lại: build và đẩy image bằng Actions
5. (Sau này) Triển khai lên AWS

## Tài liệu chính thức (nên đọc, luôn cập nhật)

- Docker, GitHub Actions: https://docs.docker.com/build/ci/github-actions/multi-platform/
- Action `docker/build-push-action` (đang dùng trong `cd.yml`): https://github.com/docker/build-push-action
- Tìm thêm trên docs.docker.com: "Multi-stage builds", "Docker Compose", "Best practices for writing Dockerfiles"
- Docs của GitHub: "GitHub Actions", "Publishing Docker images", "Working with the Container registry"
- Microsoft Learn: "Containerize a .NET app"

## Coursera (tiếng Anh)

- Hands-On CI/CD with GitHub Actions - Absolute Practical (Packt): https://www.coursera.org/learn/packt-hands-on-ci-cd-with-github-actions-absolute-practical-p6yaz
- GitHub Actions Masterclass: From Beginner to Advanced (Packt): https://coursera.org/learn/packt-github-actions-masterclass-from-beginner-to-advanced-c9el8
- Learning GitHub Actions for DevOps CI/CD (Packt): https://www.coursera.org/learn/packt-learning-github-actions-for-devops-ci-cd-jb7lj
- Build a CI/CD Pipeline with Docker: From Code to Deployment (project 1 giờ, dùng GitHub Actions, ví dụ Java và AWS ECR/EC2: học được luồng, ứng dụng khác nhưng cách làm tương tự). Tìm theo tên trên Coursera.

## YouTube

- Playlist Docker Tutorial - Crash Course (tuyển chọn bởi Class Central): https://www.classcentral.com/classroom/youtube-docker-tutorial-crash-course-2019-133373
- Kênh nên tìm: **TechWorld with Nana** (Docker, GitHub Actions, CI/CD), **KodeKloud** (Docker cơ bản)
- Tiếng Việt, tìm theo từ khóa: "Docker từ cơ bản đến nâng cao", "CI/CD GitHub Actions tiếng Việt", "Dockerfile multi-stage build .NET", "Docker Compose tiếng Việt". Ưu tiên video ra mắt trong 2 năm gần đây.

## Khóa tiếng Việt miễn phí

- Docker cơ bản trên Inflearn (có phụ đề tiếng Việt, từ khái niệm đến docker-compose): https://www.inflearn.com/vi/course/docker_basics_klein

## Cách học bằng chính repo này

1. Chạy `docker compose up --build`, mở frontend và `/health` của backend.
2. Đọc `backend/Dockerfile`, tự giải thích từng dòng, rồi sửa thử và build lại.
3. Cố ý làm hỏng một test, mở PR, xem CI chặn thế nào.
4. Gắn tag `v0.0.1`, xem image xuất hiện ở tab Packages.
