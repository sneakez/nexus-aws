# Lab thử nghiệm CI/CD: GitHub Actions → Amazon ECR → ECS Fargate

> **Trạng thái:** tài liệu thử nghiệm độc lập, chưa phải luồng chính thức của Workshop NexusOMS.  
> **Phạm vi:** tự động kiểm thử, build và triển khai **backend**. Frontend vẫn được build rồi upload lên S3/CloudFront theo tài liệu triển khai chính.  
> **Mục tiêu:** người mới có thể tạo Supabase và toàn bộ runtime AWS cần thiết, sau đó nối GitHub Actions vào ECR/ECS. Nếu tài nguyên đã tồn tại thì kiểm tra đúng cấu hình và tái sử dụng, không tạo bản trùng.

## 1. Sau khi hoàn thành, hệ thống chạy như thế nào?

```text
Nhấn Run workflow trên GitHub
        ↓
GitHub Actions chạy dotnet test
        ↓
GitHub OIDC xin AWS STS cấp credential tạm thời
        ↓
Docker build backend → gắn tag bằng commit SHA → push Amazon ECR
        ↓
GitHub Actions tạo revision ECS task definition mới
        ↓
ECS cập nhật service → Fargate thay task cũ bằng task mới
        ↓
ALB health check /health → deployment thành công
```

Luồng này thay thế đúng ba thao tác thủ công:

1. Build Docker image trên máy cá nhân.
2. Đăng nhập và push image lên ECR bằng PowerShell.
3. Tạo task definition revision rồi cập nhật ECS service bằng Console.

Luồng này **không thay đổi** Supabase, Secrets Manager, VPC, NAT Gateway, ALB, S3, CloudFront hoặc cấu trúc database.

### CI và CD trong lab này

- **CI:** restore/build/test backend trước khi tạo image.
- **CD:** push image bất biến lên ECR và cập nhật ECS service.
- Ban đầu chỉ dùng `workflow_dispatch`, nghĩa là phải bấm **Run workflow**. Cách này tránh deploy ngoài ý muốn và dễ kiểm soát chi phí khi đang thử nghiệm.

## 2. Quy tắc bảo mật

Lab dùng GitHub OIDC, không lưu `AWS_ACCESS_KEY_ID` hoặc `AWS_SECRET_ACCESS_KEY` trong GitHub. GitHub nhận credential AWS tạm thời từ STS cho đúng repository và branch `main`.

- Không commit mật khẩu Supabase, connection string hoặc webhook secret.
- Không gắn `AdministratorAccess` cho GitHub Actions.
- Database secret chỉ nằm trong AWS Secrets Manager và ECS task definition.
- GitHub repository chỉ chứa mã nguồn, task definition không có secret plaintext và workflow.

Tài liệu tham khảo chính thức:

- [GitHub: Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
- [AWS configure credentials action](https://github.com/aws-actions/configure-aws-credentials)
- [AWS Amazon ECR login action](https://github.com/aws-actions/amazon-ecr-login)
- [AWS render ECS task definition action](https://github.com/aws-actions/amazon-ecs-render-task-definition)
- [AWS deploy ECS task definition action](https://github.com/aws-actions/amazon-ecs-deploy-task-definition)

## 3. Điều kiện trước khi bắt đầu

### 3.1 Công cụ trên máy cá nhân

Mở PowerShell và kiểm tra:

```powershell
git --version
gh --version
dotnet --version
docker version
aws --version
node --version
npx --version
```

Yêu cầu của repository hiện tại:

- .NET SDK 10.x.
- Docker Desktop đang chạy Linux containers.
- Git.
- GitHub CLI (`gh`) để đăng nhập, tạo/kiểm tra repository và lấy immutable ID dùng cho OIDC.
- Node.js/npm để gọi Supabase CLI bằng `npx`.
- AWS CLI v2 để đọc cấu hình AWS hiện tại và xuất task definition.

Nếu chưa có GitHub CLI trên Windows:

```powershell
winget install --id GitHub.cli
```

Đóng rồi mở lại PowerShell, sau đó đăng nhập:

```powershell
gh auth login
```

Chọn lần lượt **GitHub.com → HTTPS → Login with a web browser**. Không ghi token GitHub vào file trong repository.

### 3.2 Tài nguyên sẽ tạo hoặc tái sử dụng trên AWS

Phần 6 hướng dẫn tạo các tài nguyên dưới đây. Nếu tài khoản đã có đúng tài nguyên thì chỉ kiểm tra tên và cấu hình rồi chuyển sang phần 7.

| Tài nguyên | Giá trị mẫu của NexusOMS |
|---|---|
| Region | `ap-southeast-1` |
| ECR repository | `nexusoms-demo-api` |
| ECS cluster | `nexusoms-demo-cluster` |
| ECS task definition family | `nexusoms-demo-api` |
| Container name | `api` |
| Container port | `8080` |
| ALB health check | `/health` |

ECS service có thể là `nexusoms-demo-api-service` hoặc có hậu tố do Console tạo. Phần 9 sẽ lấy đúng tên từ AWS, không tự đoán.

### 3.3 Những gì phải tạo và những gì được tái sử dụng

| Thành phần | Hành động trong lab |
|---|---|
| Supabase project | Tạo mới nếu người thực hành chưa có môi trường; nếu đã có NexusOMS chạy được thì tái sử dụng |
| GitHub repository `nexusoms-cicd-lab` | Tạo mới để thử CI/CD mà không ảnh hưởng repository chính |
| GitHub Actions workflow | Tạo mới trong repository lab |
| GitHub OIDC provider trong AWS | Chỉ tạo nếu tài khoản AWS chưa có provider `token.actions.githubusercontent.com` |
| IAM deploy policy và IAM deploy role | Tạo mới, giới hạn đúng ECR repository, ECS service và branch `main` |
| VPC, subnet, NAT, Security Group, ALB | Tạo ở phần 6 nếu chưa có; tái sử dụng nếu đúng cấu hình |
| ECR, ECS cluster, task definition, service, Fargate | Tạo ở phần 6 nếu chưa có; tái sử dụng nếu đúng cấu hình |
| CloudWatch log group | Tạo một lần; tái sử dụng cho các revision tiếp theo |
| Secrets Manager secret | Tái sử dụng nếu trỏ đúng Supabase; cập nhật nếu dùng Supabase project mới |

Không tạo access key AWS cho GitHub. OIDC là phần thay thế access key dài hạn.

## 4. Lấy mã nguồn về máy

```powershell
git clone https://github.com/ThanhBinhDuongNguyen/nexus-aws.git
cd nexus-aws
git switch main
git pull
```

Kiểm tra đúng repository:

```powershell
git remote -v
git status
```

Không tiếp tục nếu đang ở một repository khác hoặc có file chưa commit mà bạn không hiểu nguồn gốc.

## 5. Tạo Supabase cho người thực hành mới

Nếu đang tái sử dụng Supabase NexusOMS đã chạy được, bỏ qua mục 5 và sang mục 6.

### 5.1 Tạo project

1. Mở [Supabase Dashboard](https://supabase.com/dashboard).
2. Chọn **New project**.
3. Chọn organization của bạn.
4. Điền tên project, ví dụ:

```text
nexusoms-cicd-lab
```

5. Tạo database password mạnh và lưu trong password manager. Không commit password này.
6. Chọn region gần nơi demo; nếu muốn gần AWS Singapore thì chọn region tương ứng khả dụng trong Supabase.
7. Chọn **Create new project** và chờ project khởi tạo xong.

### 5.2 Lấy các giá trị Supabase

Trong project Supabase, lưu riêng các giá trị sau:

| Giá trị | Vị trí lấy |
|---|---|
| `PROJECT_REF` | Project Settings → General → Project ID |
| `SUPABASE_URL` | Connect hoặc Project Settings → API |
| Publishable/anon key | Connect hoặc Project Settings → API Keys |
| Session pooler connection string | Connect → Direct/ORM → Session pooler |

Backend cần connection string Npgsql dạng sau. Thay toàn bộ placeholder bằng giá trị từ màn hình **Connect**, không tự đoán hostname hoặc username:

```text
Host=<SESSION_POOLER_HOST>;Port=5432;Database=postgres;Username=<POOLER_USERNAME>;Password=<DATABASE_PASSWORD>;SSL Mode=Require;Trust Server Certificate=true
```

### 5.3 Đẩy migrations

Tại thư mục gốc repository:

```powershell
npx supabase@latest login
npx supabase@latest link --project-ref <PROJECT_REF>
npx supabase@latest db push --remote
```

Kết quả cần thấy: Supabase CLI áp dụng các file trong `supabase/migrations` và kết thúc không có lỗi SQL.

> Không chạy `backend/tools/lab-auth-bootstrap.sql` hoặc `backend/tools/lab-actor-seed.sql` lên Supabase thật. Hai file đó chỉ tạo auth giả cho PostgreSQL local/CI.

### 5.4 Tạo tài khoản đăng nhập và role

1. Supabase → **Authentication → Users → Add user → Create new user**.
2. Nhập email và password dùng để demo.
3. Bật xác nhận email nếu Console có tùy chọn này, rồi tạo user.
4. Copy UUID của user vừa tạo.

(Chỗ này tôi chỉ cho vào table profile cập nhật luôn cho lẹ khỏi cần lệnh. Hình hướng dẫn 15. Update role for account.png)
5. Mở **SQL Editor → New query** và chạy, sau khi thay `<USER_UUID>`:

```sql
update public.profiles
set role = 'manager', is_active = true
where id = '<USER_UUID>'::uuid;

select id, email, role, is_active
from public.profiles
where id = '<USER_UUID>'::uuid;
```

Kết quả phải có đúng một profile với role `manager` và `is_active = true`.

### 5.5 Tạo secret backend trong AWS Secrets Manager

Nếu secret `nexusoms/demo/application` đã đúng thì không tạo lại. Nếu đây là môi trường mới:

1. Chọn region **Asia Pacific (Singapore) / `ap-southeast-1`**.
2. Mở **Secrets Manager → Store a new secret**.
3. Chọn **Other type of secret**.
4. Chuyển sang **Plaintext**, rồi dán JSON bên dưới sau khi thay toàn bộ placeholder.

```json
{
  "postgresConnectionString": "Host=<SESSION_POOLER_HOST>;Port=5432;Database=postgres;Username=<POOLER_USERNAME>;Password=<DATABASE_PASSWORD>;SSL Mode=Require;Trust Server Certificate=true",
  "supabaseUrl": "https://<PROJECT_REF>.supabase.co",
  "systemActorId": "<USER_UUID>",
  "webhookSigningSecret": "<RANDOM_SECRET_AT_LEAST_32_CHARACTERS>"
}
```

Tạo webhook secret ngẫu nhiên trong PowerShell:

```powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
  $rng.GetBytes($bytes)
} finally {
  $rng.Dispose()
}
[Convert]::ToBase64String($bytes)
```

5. Chọn **Next**; Secret name nhập:

```text
nexusoms/demo/application
```

6. Không bật automatic rotation cho lab ngắn hạn; chọn **Next → Store**.
7. Mở secret vừa tạo và copy **Secret ARN** đầy đủ. ARN có hậu tố ngẫu nhiên, không tự ghép bằng tay.

Kiểm tra bằng CLI:

```powershell
aws secretsmanager describe-secret `
  --secret-id nexusoms/demo/application `
  --region ap-southeast-1
```

ECS task definition phải map:

| Environment key | JSON key trong Secrets Manager |
|---|---|
| `ConnectionStrings__Postgres` | `postgresConnectionString` |
| `Supabase__Url` | `supabaseUrl` |
| `WebhookSimulator__SystemActorId` | `systemActorId` |
| `WebhookSimulator__Secret` | `webhookSigningSecret` |

Không hiển thị hoặc commit giá trị secret. GitHub Actions không cần quyền đọc secret này; **ECS execution role** sẽ đọc lúc khởi động task.

## 6. Tạo hạ tầng AWS runtime nếu chưa có

Nếu các tài nguyên dưới đây đã tồn tại và đúng cấu hình, không tạo thêm. Ghi ID/ARN/tên thật để dùng ở các phần tiếp theo.

### 6.1 Giá trị chuẩn dùng xuyên suốt

| Thành phần | Giá trị |
|---|---|
| Region | `ap-southeast-1` |
| VPC | `nexusoms-demo-vpc` — `10.80.0.0/16` |
| Public subnet A | `nexusoms-demo-public-a` — `10.80.0.0/24` |
| Public subnet B | `nexusoms-demo-public-b` — `10.80.1.0/24` |
| Private subnet A | `nexusoms-demo-private-a` — `10.80.10.0/24` |
| Private subnet B | `nexusoms-demo-private-b` — `10.80.11.0/24` |
| ECR | `nexusoms-demo-api` |
| ECS cluster | `nexusoms-demo-cluster` |
| Task definition family | `nexusoms-demo-api` |
| ECS service | `nexusoms-demo-api-service` |
| Container | `api`, port `8080` |

Chọn hai Availability Zone khác nhau đang có trong tài khoản. Public A và private A phải cùng AZ; public B và private B phải cùng AZ. Không sao chép tên AZ từ tài khoản khác vì ánh xạ AZ có thể khác nhau giữa các tài khoản.

### 6.2 Tạo VPC và bốn subnet

1. Mở **VPC → Your VPCs → Create VPC**.
2. Chọn **VPC only**; nhập Name tag `nexusoms-demo-vpc`, IPv4 CIDR `10.80.0.0/16`, Tenancy `Default`; tạo VPC.
3. Chọn VPC → **Actions → Edit VPC settings**; bật **DNS resolution** và **DNS hostnames**.
4. Mở **VPC → Subnets → Create subnet**, chọn VPC vừa tạo và tạo đủ bốn subnet theo bảng 6.1.
5. Chọn từng public subnet → **Actions → Edit subnet settings** → bật **Auto-assign public IPv4**.
6. Hai private subnet phải tắt auto-assign public IPv4. ECS task sau này cũng phải đặt **Public IP = Disabled**.

### 6.3 Internet Gateway, route public và hai NAT Gateway

1. **VPC → Internet gateways → Create internet gateway**; Name `nexusoms-demo-igw`; tạo rồi attach vào `nexusoms-demo-vpc`.
2. **VPC → Route tables → Create route table**; Name `nexusoms-demo-public-rt`; chọn VPC trên.
3. Trong route table public, thêm route `0.0.0.0/0` tới `nexusoms-demo-igw`; associate cả public-a và public-b.
4. **VPC → Elastic IPs → Allocate Elastic IP address** hai lần. Đặt Name `nexusoms-demo-nat-eip-a` và `nexusoms-demo-nat-eip-b`.
5. **VPC → NAT gateways → Create NAT gateway**:
   - `nexusoms-demo-nat-a`: public-a, Public connectivity, EIP A.
   - `nexusoms-demo-nat-b`: public-b, Public connectivity, EIP B.
6. Chờ cả hai NAT có trạng thái **Available**.
7. Tạo `nexusoms-demo-private-a-rt`: route `0.0.0.0/0` tới NAT A; associate **chỉ** private-a.
8. Tạo `nexusoms-demo-private-b-rt`: route `0.0.0.0/0` tới NAT B; associate **chỉ** private-b.

Hai NAT tăng độ sẵn sàng và tránh private subnet A phụ thuộc NAT ở AZ B, nhưng phát sinh phí theo giờ và dữ liệu xử lý. Lab này giữ hai NAT để khớp kiến trúc chính thức; phải xóa sau khi thử nghiệm nếu không dùng tiếp.

Không tạo bốn Interface Endpoint cho `ecr.api`, `ecr.dkr`, `logs` và `secretsmanager`. ECS đi ra các dịch vụ này qua NAT. S3 Gateway Endpoint miễn phí theo giờ là tùy chọn, không bắt buộc cho backend CI/CD này.

### 6.4 Tạo Security Group

Mở **VPC → Security Groups → Create security group**; tất cả nằm trong `nexusoms-demo-vpc`.

1. `nexusoms-demo-alb-sg`:
   - Inbound: HTTP TCP `80`.
   - Khi thử độc lập: source `My IP` để kiểm tra trực tiếp ALB.
   - Khi gắn CloudFront chính thức: đổi source thành managed prefix list `com.amazonaws.global.cloudfront.origin-facing`.
   - Outbound: giữ mặc định.
2. `nexusoms-demo-task-sg`:
   - Inbound: Custom TCP `8080`.
   - Source: chọn Security Group `nexusoms-demo-alb-sg`, không nhập `0.0.0.0/0`.
   - Outbound: giữ mặc định để task kết nối Supabase và AWS services qua NAT.

`My IP` tiện cho lab nhưng sẽ đổi khi mạng của bạn đổi và không phù hợp production. Không mở port 8080 ra Internet.

### 6.5 Tạo IAM role cho ECS

Mở **IAM → Roles → Create role**. Trusted entity cho cả hai role: **AWS service → Elastic Container Service → Elastic Container Service Task**.

**Execution role**

1. Gắn AWS-managed policy `AmazonECSTaskExecutionRolePolicy`.
2. Role name: `nexusoms-demo-ecs-execution-role`.
3. Mở role → **Add permissions → Create inline policy → JSON**.
4. Thay `<SECRET_ARN>` bằng ARN lấy ở mục 5.5 rồi dán:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "<SECRET_ARN>"
    }
  ]
}
```

5. Policy name: `ReadNexusOmsApplicationSecret`.

**Task role**

1. Tạo role thứ hai: `nexusoms-demo-ecs-task-role`.
2. Không gắn `AdministratorAccess` hay policy rộng. Backend hiện không gọi AWS API trực tiếp.

Execution role phục vụ ECS pull image, ghi log và lấy secret. Task role là quyền của ứng dụng đang chạy; không tráo hai role.

### 6.6 Tạo CloudWatch Log Group

1. Mở **CloudWatch → Logs → Log management → Create log group**.
2. Log group name:

```text
/ecs/nexusoms-demo-api
```

3. Retention: `7 days` cho lab tiết kiệm chi phí.

### 6.7 Tạo ECR repository

1. Mở **Amazon ECR → Private registry → Repositories → Create repository**.
2. Repository name `nexusoms-demo-api`; Visibility **Private**.
3. Image tag mutability **Immutable**; encryption AES-256 mặc định.
4. Nếu Console chỉ có **Scan on push** trong phần deprecated thì bật hoặc tắt đều không ảnh hưởng khả năng deploy. Scanning hiện được quản lý ở registry-level.
5. Tạo repository và copy URI, dạng:

```text
<AWS_ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com/nexusoms-demo-api
```

### 6.8 Build và push image bootstrap đầu tiên

ECS cần một image tồn tại trước khi tạo task definition. Chạy từ repository root; thay URI bằng giá trị đã copy:

```powershell
$Region = 'ap-southeast-1'
$EcrRepositoryUri = '<ECR_REPOSITORY_URI>'
$Registry = $EcrRepositoryUri.Split('/')[0]
$ImageTag = 'bootstrap-01'

aws ecr get-login-password --region $Region |
  docker login --username AWS --password-stdin $Registry

docker build --file backend/Dockerfile --tag "nexusoms-demo-api:$ImageTag" backend
docker tag "nexusoms-demo-api:$ImageTag" "$EcrRepositoryUri`:$ImageTag"
docker push "$EcrRepositoryUri`:$ImageTag"
```

Repository dùng immutable tags nên không dùng lại `bootstrap-01` nếu tag đã tồn tại; đổi thành tag mới.

### 6.9 Tạo ECS cluster

1. Mở **Amazon ECS → Clusters → Create cluster**.
2. Cluster name `nexusoms-demo-cluster`; tạo cluster dùng Fargate.
3. Container Insights là tùy chọn có chi phí. Có thể giữ CloudWatch monitoring mặc định cho lab; log ứng dụng vẫn được gửi bằng `awslogs`.

### 6.10 Tạo Target Group và ALB

**Target Group**

1. **EC2 → Target Groups → Create target group**.
2. Target type **IP addresses**; Name `nexusoms-demo-api-tg`; Protocol HTTP; Port `8080`; VPC `nexusoms-demo-vpc`.
3. Health check path `/health`; success code `200`; tạo target group.
4. Không đăng ký IP thủ công; ECS service sẽ đăng ký task IP.

**Application Load Balancer**

1. **EC2 → Load Balancers → Create load balancer → Application Load Balancer**.
2. Name `nexusoms-demo-alb`; Scheme **Internet-facing**; IPv4.
3. Network mapping: `nexusoms-demo-vpc`, chọn cả public-a và public-b.
4. Security Group: chỉ chọn `nexusoms-demo-alb-sg`.
5. Listener HTTP:80 → forward tới `nexusoms-demo-api-tg`; tạo ALB.

### 6.11 Tạo ECS task definition

Mở **Amazon ECS → Task definitions → Create new task definition**:

1. Family `nexusoms-demo-api`; Fargate; Linux/X86_64.
2. CPU `0.5 vCPU` (`512`), Memory `1 GB` (`1024 MiB`).
3. Task role `nexusoms-demo-ecs-task-role`; execution role `nexusoms-demo-ecs-execution-role`.
4. Container name `api`; Image URI là full ECR URI gồm tag bootstrap; container port `8080` TCP.
5. Environment variable dạng Value: `ASPNETCORE_ENVIRONMENT=Production`.
6. Thêm bốn dòng **Value type = ValueFrom**. Chọn secret `nexusoms/demo/application` và JSON key riêng:

| Environment key | JSON key |
|---|---|
| `ConnectionStrings__Postgres` | `postgresConnectionString` |
| `Supabase__Url` | `supabaseUrl` |
| `WebhookSimulator__SystemActorId` | `systemActorId` |
| `WebhookSimulator__Secret` | `webhookSigningSecret` |

7. Logging: `awslogs`; group `/ecs/nexusoms-demo-api`; region `ap-southeast-1`; stream prefix `api`.
8. Tạo task definition.

Không đặt cả bốn ValueFrom bằng tên secret thuần. Mỗi dòng phải tham chiếu đúng JSON key, nếu không backend nhận cả JSON object và lỗi cấu hình.

### 6.12 Tạo ECS service

1. Cluster `nexusoms-demo-cluster` → **Services → Create**.
2. Compute option **Fargate**; chọn task definition revision vừa tạo.
3. Service name `nexusoms-demo-api-service`; scheduling **Replica**; Desired tasks `1`.
4. Networking: VPC `nexusoms-demo-vpc`; chọn private-a và private-b; SG `nexusoms-demo-task-sg`; **Public IP = Disabled**.
5. Load balancing: chọn ALB `nexusoms-demo-alb`, listener HTTP:80, target group `nexusoms-demo-api-tg`, container `api:8080`.
6. Bật deployment circuit breaker/rollback nếu Console cung cấp; tạo service.
7. Chờ Running = Desired và Target Group báo **Healthy**.

Kiểm tra cuối phần 6:

```powershell
aws ecs describe-services `
  --cluster nexusoms-demo-cluster `
  --services nexusoms-demo-api-service `
  --region ap-southeast-1 `
  --query 'services[0].{status:status,running:runningCount,desired:desiredCount,taskDefinition:taskDefinition}'
```

Chỉ tiếp tục khi `status=ACTIVE`, `running=1`, `desired=1` và target healthy. Frontend S3/CloudFront không thuộc phạm vi pipeline backend này; tiếp tục dùng tài liệu Workshop chính để triển khai frontend.

## 7. Kiểm tra backend trước khi tạo CI/CD

```powershell
dotnet test backend/tests/NexusOMS.ApiTests/NexusOMS.ApiTests.csproj --configuration Release
docker build --file backend/Dockerfile --tag nexusoms-api:cicd-check backend
```

Chỉ tiếp tục khi test thành công và Docker build không báo lỗi. Docker context bắt buộc là thư mục `backend`, không phải repository root.

## 8. Tạo repository GitHub riêng cho lab

### 8.1 Tạo repository rỗng

1. GitHub → ảnh đại diện → **Your repositories → New**.
2. Owner: tài khoản hoặc organization của bạn.
3. Repository name:

```text
nexusoms-cicd-lab
```

4. Chọn Private hoặc Public tùy nhu cầu.
5. **Không** chọn Add a README, `.gitignore` hoặc license.
6. Chọn **Create repository**.

Giả sử repository mới là:

```text
https://github.com/<GITHUB_OWNER>/nexusoms-cicd-lab
```

### 8.2 Lấy immutable ID của owner và repository

GitHub repository tạo từ ngày 15/07/2026 sử dụng OIDC subject có immutable organization/user ID và repository ID. Không dùng mẫu subject cũ chỉ chứa tên owner/repository.

Thay `<GITHUB_OWNER>` bằng username hoặc organization thật rồi chạy:

```powershell
$GitHubOwner = '<GITHUB_OWNER>'
$GitHubRepository = 'nexusoms-cicd-lab'
$RepoInfo = gh api "repos/$GitHubOwner/$GitHubRepository" | ConvertFrom-Json
$GitHubOwnerId = $RepoInfo.owner.id
$GitHubRepositoryId = $RepoInfo.id

"GITHUB_OWNER=$GitHubOwner"
"GITHUB_OWNER_ID=$GitHubOwnerId"
"GITHUB_REPOSITORY_ID=$GitHubRepositoryId"
```

Ghi lại cả ba giá trị. Không tự lấy số từ URL hoặc suy đoán ID.

### 8.3 Giữ remote gốc và thêm remote lab

Không đổi hoặc xóa `origin`. Thêm một remote riêng tên `lab`:

```powershell
git remote -v
git remote add lab https://github.com/<GITHUB_OWNER>/nexusoms-cicd-lab.git
git push -u lab main
```

Nếu đã có remote `lab`, kiểm tra trước khi đổi:

```powershell
git remote get-url lab
```

Chỉ khi URL sai mới chạy:

```powershell
git remote set-url lab https://github.com/<GITHUB_OWNER>/nexusoms-cicd-lab.git
```

## 9. Ghi lại chính xác tài nguyên AWS hiện tại

Trong PowerShell, cấu hình profile/region bạn đã dùng cho workshop:

```powershell
$env:AWS_PROFILE = 'nexusoms-demo'
$env:AWS_REGION = 'ap-southeast-1'
aws sts get-caller-identity
```

Lưu account ID:

```powershell
$AwsAccountId = aws sts get-caller-identity --query Account --output text
$AwsAccountId
```

Liệt kê đúng cluster và service:

```powershell
aws ecs list-clusters --region ap-southeast-1
aws ecs list-services --cluster nexusoms-demo-cluster --region ap-southeast-1
```

Copy phần cuối service ARN. Ví dụ ARN kết thúc bằng `/nexusoms-demo-api-service-o475jyth` thì `ECS_SERVICE` chính là:

```text
nexusoms-demo-api-service-o475jyth
```

Gán đúng tên service rồi lấy service ARN. Thay giá trị mẫu nếu tên của bạn khác:

```powershell
$EcsService = 'nexusoms-demo-api-service-o475jyth'
$EcsServiceArn = aws ecs describe-services `
  --cluster nexusoms-demo-cluster `
  --services $EcsService `
  --region ap-southeast-1 `
  --query 'services[0].serviceArn' `
  --output text
$EcsServiceArn
```

Kết quả phải bắt đầu bằng `arn:aws:ecs:ap-southeast-1:` và kết thúc bằng đúng tên service.

Lấy ECR URI và role ARN:

```powershell
aws ecr describe-repositories `
  --repository-names nexusoms-demo-api `
  --region ap-southeast-1 `
  --query 'repositories[0].repositoryUri' `
  --output text

aws iam get-role `
  --role-name nexusoms-demo-ecs-execution-role `
  --query 'Role.Arn' `
  --output text

aws iam get-role `
  --role-name nexusoms-demo-ecs-task-role `
  --query 'Role.Arn' `
  --output text
```

Ghi lại:

```text
AWS_ACCOUNT_ID=<giá trị từ sts>
AWS_REGION=ap-southeast-1
ECR_REPOSITORY=nexusoms-demo-api
ECS_CLUSTER=nexusoms-demo-cluster
ECS_SERVICE=<tên thật lấy từ list-services>
ECS_SERVICE_ARN=<ARN lấy từ describe-services>
ECS_TASK_FAMILY=nexusoms-demo-api
ECS_CONTAINER_NAME=api
EXECUTION_ROLE_ARN=<ARN vừa lấy>
TASK_ROLE_ARN=<ARN vừa lấy>
```

## 10. Thêm GitHub làm OIDC provider trong AWS

Chỉ tạo một lần cho mỗi AWS account. Nếu provider đã tồn tại, không tạo provider thứ hai.

1. AWS Console → **IAM → Identity providers**.
2. Tìm provider `token.actions.githubusercontent.com`.
3. Nếu chưa có, chọn **Add provider**.
4. Provider type: **OpenID Connect**.
5. Provider URL:

```text
https://token.actions.githubusercontent.com
```

6. Audience:

```text
sts.amazonaws.com
```

7. Chọn **Add provider**.

## 11. Tạo IAM policy tối thiểu cho GitHub Actions

### 11.1 Tạo policy

IAM → Policies → Create policy → tab JSON. Paste JSON dưới đây sau khi thay:

- `<AWS_ACCOUNT_ID>`.
- `<ECS_SERVICE_ARN>`.
- `<EXECUTION_ROLE_ARN>`.
- `<TASK_ROLE_ARN>`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GetEcrAuthorizationToken",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "PushBackendImage",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:CompleteLayerUpload",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": "arn:aws:ecr:ap-southeast-1:<AWS_ACCOUNT_ID>:repository/nexusoms-demo-api"
    },
    {
      "Sid": "ReadAndRegisterTaskDefinition",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DeployOnlyNexusOmsService",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:UpdateService"
      ],
      "Resource": "<ECS_SERVICE_ARN>"
    },
    {
      "Sid": "PassOnlyNexusOmsTaskRoles",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "<EXECUTION_ROLE_ARN>",
        "<TASK_ROLE_ARN>"
      ],
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "ecs-tasks.amazonaws.com"
        }
      }
    }
  ]
}
```

Policy name:

```text
NexusOmsGitHubEcsDeploy
```

## 12. Tạo IAM role cho GitHub OIDC

1. IAM → Roles → Create role.
2. Trusted entity type: **Web identity**.
3. Identity provider: `token.actions.githubusercontent.com`.
4. Audience: `sts.amazonaws.com`.
5. GitHub organization: nhập `<GITHUB_OWNER>`.
6. GitHub repository: `nexusoms-cicd-lab`.
7. GitHub branch: `main` nếu Console có trường branch.
8. Gắn policy `NexusOmsGitHubEcsDeploy`.
9. Role name:

```text
nexusoms-demo-github-deploy-role
```

10. Tạo role rồi mở tab **Trust relationships → Edit trust policy**. Kiểm tra policy giới hạn đúng repository và branch:

Trước khi paste, thay đủ bốn placeholder:

- `<AWS_ACCOUNT_ID>` lấy bằng `aws sts get-caller-identity`.
- `<GITHUB_OWNER>` là username/organization sở hữu repository.
- `<GITHUB_OWNER_ID>` và `<GITHUB_REPOSITORY_ID>` lấy bằng `gh api` ở mục 8.2.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:<GITHUB_OWNER>@<GITHUB_OWNER_ID>/nexusoms-cicd-lab@<GITHUB_REPOSITORY_ID>:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Copy role ARN, ví dụ:

```text
arn:aws:iam::<AWS_ACCOUNT_ID>:role/nexusoms-demo-github-deploy-role
```

Không dùng wildcard `repo:*/*` vì repository bất kỳ sẽ có thể xin quyền deploy.

> GitHub đã thay đổi subject claim cho repository mới từ 15/07/2026. Nếu repository của bạn được tạo trước mốc này, subject cũ có thể không chứa ID. Lab này tạo repository mới nên phải dùng mẫu immutable ID phía trên.

## 13. Xuất task definition hiện tại vào repository

Chạy tại repository root. Đoạn PowerShell sau ghi UTF-8 không BOM, tránh lỗi encoding do `>` trên một số phiên bản Windows PowerShell:

```powershell
$taskDefinitionJson = aws ecs describe-task-definition `
  --task-definition nexusoms-demo-api `
  --query taskDefinition `
  --output json `
  --region ap-southeast-1

[IO.File]::WriteAllText(
  (Join-Path (Get-Location) 'infra\ecs-task-definition.json'),
  ($taskDefinitionJson -join [Environment]::NewLine),
  [Text.UTF8Encoding]::new($false)
)
```

Kiểm tra JSON:

```powershell
Get-Content infra\ecs-task-definition.json -Raw | ConvertFrom-Json | Out-Null
Select-String -Path infra\ecs-task-definition.json -Pattern '"name": "api"'
```

File phải chứa container tên `api`. File không được chứa mật khẩu database hoặc giá trị secret plaintext; trường `valueFrom` chỉ nên chứa ARN Secrets Manager.

## 14. Tạo GitHub repository variables

Mở repository `nexusoms-cicd-lab` → **Settings → Secrets and variables → Actions → Variables → New repository variable**.

Tạo từng variable:

| Name | Value |
|---|---|
| `AWS_REGION` | `ap-southeast-1` |
| `AWS_ROLE_ARN` | ARN của `nexusoms-demo-github-deploy-role` |
| `ECR_REPOSITORY` | `nexusoms-demo-api` |
| `ECS_CLUSTER` | `nexusoms-demo-cluster` |
| `ECS_SERVICE` | tên service thật lấy ở mục 9 |
| `ECS_TASK_DEFINITION` | `infra/ecs-task-definition.json` |
| `ECS_CONTAINER_NAME` | `api` |

Đây là tên tài nguyên, không phải secret. Không tạo `AWS_ACCESS_KEY_ID` hoặc `AWS_SECRET_ACCESS_KEY`.

## 15. Tạo workflow triển khai backend

Tạo file:

```text
.github/workflows/deploy-backend-ecs.yml
```

Nội dung:

```yaml
name: Deploy backend to ECS

on:
  workflow_dispatch:

permissions:
  contents: read
  id-token: write

concurrency:
  group: nexusoms-demo-backend
  cancel-in-progress: false

env:
  AWS_REGION: ${{ vars.AWS_REGION }}
  ECR_REPOSITORY: ${{ vars.ECR_REPOSITORY }}
  ECS_CLUSTER: ${{ vars.ECS_CLUSTER }}
  ECS_SERVICE: ${{ vars.ECS_SERVICE }}
  ECS_TASK_DEFINITION: ${{ vars.ECS_TASK_DEFINITION }}
  ECS_CONTAINER_NAME: ${{ vars.ECS_CONTAINER_NAME }}

jobs:
  deploy:
    name: Test, build and deploy backend
    runs-on: ubuntu-latest

    steps:
      - name: Checkout source
        uses: actions/checkout@v4

      - name: Setup .NET 10
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: 10.0.x

      - name: Run backend tests
        run: dotnet test backend/tests/NexusOMS.ApiTests/NexusOMS.ApiTests.csproj --configuration Release

      - name: Configure temporary AWS credentials through OIDC
        uses: aws-actions/configure-aws-credentials@v6.3.0
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push immutable image
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          IMAGE_URI="$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG"
          docker build --file backend/Dockerfile --tag "$IMAGE_URI" backend
          docker push "$IMAGE_URI"
          echo "image=$IMAGE_URI" >> "$GITHUB_OUTPUT"

      - name: Render new ECS task definition revision
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: ${{ env.ECS_TASK_DEFINITION }}
          container-name: ${{ env.ECS_CONTAINER_NAME }}
          image: ${{ steps.build-image.outputs.image }}

      - name: Deploy task definition to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
```

Tag image dùng `${{ github.sha }}` nên mỗi commit trỏ tới đúng một image, hỗ trợ truy vết và rollback. Không dùng tag `latest` cho luồng triển khai này.

## 16. Commit và push lab

```powershell
git add infra/ecs-task-definition.json .github/workflows/deploy-backend-ecs.yml
git diff --cached --check
git commit -m "ci: deploy backend to ECS with GitHub OIDC"
git push lab main
```

Lệnh chỉ push lên remote `lab`, không tự push vào repository chính.

## 17. Chạy workflow lần đầu

1. GitHub → repository `nexusoms-cicd-lab` → **Actions**.
2. Chọn **Deploy backend to ECS**.
3. Chọn **Run workflow**.
4. Branch: `main`.
5. Chọn **Run workflow** và mở run vừa tạo.

Thứ tự step cần xanh:

1. Checkout source.
2. Setup .NET 10.
3. Run backend tests.
4. Configure temporary AWS credentials through OIDC.
5. Login to Amazon ECR.
6. Build and push immutable image.
7. Render new ECS task definition revision.
8. Deploy task definition to ECS.

## 18. Kiểm tra deployment thực tế

### 18.1 Amazon ECR

ECR → `nexusoms-demo-api` → Images. Phải xuất hiện tag là SHA 40 ký tự của commit GitHub.

### 18.2 Amazon ECS

ECS → Clusters → `nexusoms-demo-cluster` → service thật:

- Deployment mới phải đạt trạng thái completed.
- Running tasks bằng Desired tasks.
- Task definition revision tăng lên.
- Task mới dùng image URI có tag commit SHA.

### 18.3 Target group và health endpoint

EC2 → Target Groups → `nexusoms-demo-api-tg` → Targets. Target phải **Healthy**.

Nếu ALB cho phép truy cập trực tiếp trong cấu hình demo:

```text
http://<ALB_DNS>/health
```

Kết quả mong đợi:

```json
{"status":"ok"}
```

Nếu ALB chỉ nhận CloudFront, kiểm tra thông qua domain CloudFront và API route hiện tại.

### 18.4 CloudWatch Logs

CloudWatch → Log management → Log groups → `/ecs/nexusoms-demo-api`. Mở log stream mới nhất và kiểm tra:

- `Now listening on: http://[::]:8080`.
- Không có lỗi connection string, Secrets Manager hoặc `libgssapi_krb5.so.2`.

## 19. Rollback

### Cách an toàn bằng Console

1. ECS → cluster → service → **Update**.
2. Chọn task definition revision ngay trước revision vừa deploy.
3. Giữ nguyên network, load balancer và desired count.
4. Chọn **Force new deployment** rồi cập nhật service.
5. Chờ deployment ổn định và target Healthy.

### Rollback bằng CLI

Thay `<PREVIOUS_REVISION>`:

```powershell
aws ecs update-service `
  --cluster nexusoms-demo-cluster `
  --service <ECS_SERVICE> `
  --task-definition nexusoms-demo-api:<PREVIOUS_REVISION> `
  --force-new-deployment `
  --region ap-southeast-1
```

Không xóa image cũ trước khi xác nhận không còn cần rollback.

## 20. Lỗi thường gặp

### OIDC không assume được role

Thông báo thường chứa `Not authorized to perform sts:AssumeRoleWithWebIdentity`.

Kiểm tra:

- `permissions.id-token` là `write`.
- `AWS_ROLE_ARN` đúng role.
- Trust policy dùng đúng chữ hoa/thường của `<GITHUB_OWNER>/nexusoms-cicd-lab`.
- Workflow chạy từ branch `main`.
- Repository mới dùng `sub` đúng dạng `repo:<OWNER>@<OWNER_ID>/nexusoms-cicd-lab@<REPOSITORY_ID>:ref:refs/heads/main`.
- Chạy lại lệnh `gh api repos/<OWNER>/nexusoms-cicd-lab` nếu chưa chắc hai ID.

### ECR AccessDenied

Kiểm tra policy resource có đúng account ID, region và repository `nexusoms-demo-api`. `ecr:GetAuthorizationToken` phải có resource `*`.

### iam:PassRole AccessDenied

Task definition tham chiếu execution role hoặc task role khác ARN đã khai báo trong policy. Xuất lại ARN thật và cập nhật statement `PassOnlyNexusOmsTaskRoles`.

### ECS service không ổn định

Mở ECS service → Events, task đã dừng → Stopped reason, target group health và CloudWatch log. Các nguyên nhân thường gặp:

- Container không nghe port 8080.
- Health check không dùng `/health`.
- Task security group không cho ALB security group vào TCP 8080.
- Private subnet không có egress qua NAT Gateway.
- Secret mapping hoặc execution-role permission sai.

### Backend báo lỗi database/500

Kiểm tra Secrets Manager và task definition mapping. Session pooler connection string phải có `Host`, `Username`, `Password`, `SSL Mode=Require`. `systemActorId` phải là UUID của profile đang tồn tại.

### `Cannot load library libgssapi_krb5.so.2`

Workflow phải build đúng `backend/Dockerfile`. Dockerfile hiện tại đã cài `libgssapi-krb5-2`; không dùng image cũ hoặc Dockerfile frontend.

## 21. Dọn tài nguyên sau khi hoàn thành lab

Trước khi xóa, xác định tài nguyên thuộc một trong hai trường hợp:

- **Tái sử dụng từ Workshop chính:** chỉ dọn repository GitHub, IAM deploy role/policy và image SHA do lab tạo. Không xóa runtime đang phục vụ bản demo khác.
- **Được tạo riêng cho lab theo tài liệu này:** xóa toàn bộ theo thứ tự phụ thuộc bên dưới để tránh tiếp tục phát sinh phí.

### 21.1 Chỉ dọn phần CI/CD thử nghiệm

1. GitHub repository → **Settings → Actions → General → Disable actions**, hoặc xóa repository `nexusoms-cicd-lab` nếu không cần lưu lịch sử.
2. IAM → Roles: xóa `nexusoms-demo-github-deploy-role`.
3. IAM → Policies: xóa `NexusOmsGitHubEcsDeploy` nếu không còn role nào gắn policy.
4. IAM → Identity providers: chỉ xóa `token.actions.githubusercontent.com` khi chắc chắn không còn workflow nào trong AWS account dùng provider này.
5. ECR → `nexusoms-demo-api` → Images: xóa các image tag commit SHA không còn cần rollback; giữ repository và image runtime nếu hệ thống demo vẫn chạy.

### 21.2 Dọn toàn bộ runtime được tạo riêng cho lab

Thực hiện đúng thứ tự sau trong Region `ap-southeast-1`:

1. ECS → Clusters → `nexusoms-demo-cluster` → service → **Update**: đặt Desired tasks bằng `0`, chờ task dừng, sau đó **Delete service**.
2. ECS → Task definitions → `nexusoms-demo-api`: deregister các revision không còn dùng; sau đó xóa cluster nếu cluster không còn service/task.
3. EC2 → Load Balancers: xóa `nexusoms-demo-alb`; EC2 → Target Groups: xóa `nexusoms-demo-api-tg`.
4. ECR → `nexusoms-demo-api`: xóa toàn bộ image rồi xóa repository nếu không còn dùng.
5. CloudWatch → Log management → Log groups: xóa `/ecs/nexusoms-demo-api` nếu không cần giữ log minh chứng.
6. Secrets Manager: xóa `nexusoms/demo/application` nếu đây là secret riêng của lab. Chọn recovery window phù hợp; không force-delete secret dùng chung.
7. IAM → Roles: xóa `nexusoms-demo-ecs-execution-role` và `nexusoms-demo-ecs-task-role` sau khi ECS không còn tham chiếu.
8. VPC → NAT gateways: xóa hai NAT Gateway và chờ trạng thái **Deleted**; sau đó EC2 → Elastic IP addresses: release hai Elastic IP tương ứng.
9. VPC → Route tables: xóa các private route table và public route table do lab tạo sau khi bỏ subnet associations cần thiết.
10. VPC → Endpoints: xóa S3 Gateway endpoint nếu đã tạo riêng cho lab.
11. VPC → Security groups: xóa task SG, endpoint SG (nếu có) và ALB SG; giữ default security group.
12. VPC → Internet gateways: detach rồi xóa Internet Gateway.
13. VPC → Subnets: xóa bốn subnet; VPC → Your VPCs: xóa `nexusoms-demo-vpc`.
14. Supabase Dashboard: chỉ xóa project khi project được tạo riêng cho lab và không chứa dữ liệu cần giữ.

Cuối cùng, mở **AWS Resource Explorer** hoặc tìm theo tag/name `nexusoms-demo` để kiểm tra tài nguyên còn sót. Ưu tiên kiểm tra NAT Gateway, Elastic IP và ALB vì đây là nhóm có thể tiếp tục tính phí khi không có traffic. Chỉ kiểm tra thêm Interface Endpoint nếu tài khoản từng tạo chúng trong một lần thử trước; luồng chính của tài liệu này không tạo bốn Interface Endpoint.

## 22. Tiêu chí xác nhận lab đạt

- [ ] Repository lab được tạo riêng và remote `origin` không bị thay đổi.
- [ ] Supabase migrations và tài khoản manager hoạt động.
- [ ] GitHub không lưu AWS access key hoặc database password.
- [ ] OIDC trust chỉ cho đúng repository và branch `main`.
- [ ] IAM deploy role không có `AdministratorAccess`.
- [ ] Workflow chạy test trước khi build image.
- [ ] ECR image được tag bằng commit SHA.
- [ ] ECS tạo revision mới và service ổn định.
- [ ] Target group Healthy và `/health` trả `status=ok`.
- [ ] Có thể rollback về revision trước.

Sau khi toàn bộ checklist đạt, workflow này mới nên được hòa vào luồng Workshop chính.
