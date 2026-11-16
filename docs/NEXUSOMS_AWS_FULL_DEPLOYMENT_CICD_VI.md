# NexusOMS trên AWS: triển khai đầy đủ và CI/CD bằng GitHub Actions

Tài liệu này là luồng chính duy nhất để đưa NexusOMS từ source code lên Internet bằng AWS, sau đó tự động triển khai các lần cập nhật qua GitHub Actions.

Kiến trúc sử dụng:

- Frontend React/Vite: Amazon S3 riêng tư, phân phối qua Amazon CloudFront.
- Backend .NET: Docker image trong Amazon ECR, chạy bằng Amazon ECS Fargate ở hai private subnet.
- API entry point: Application Load Balancer (ALB) ở hai public subnet.
- Database và Authentication: Supabase bên ngoài AWS.
- Secret: AWS Secrets Manager.
- Log: Amazon CloudWatch Logs.
- Audit: AWS CloudTrail và ALB access logs ghi vào một Amazon S3 audit bucket riêng tư.
- CI/CD: GitHub Actions xác thực AWS bằng OIDC, không lưu access key dài hạn trong GitHub.
- Mạng outbound: hai NAT Gateway, mỗi Availability Zone một NAT Gateway.
- S3 Gateway Endpoint.
- AWS WAF: không bật trong lab.

> Phạm vi: hướng dẫn dùng AWS Console cho lần triển khai đầu tiên, sau đó dùng GitHub Actions cho các lần triển khai tiếp theo. Không sử dụng template hạ tầng tự động trong luồng này.

---

## 1. Giá trị dùng xuyên suốt

Giữ nguyên các tên dưới đây để tránh chọn nhầm tài nguyên. Giá trị đặt trong khối mã có thể sao chép trực tiếp.

| Thành phần | Giá trị |
|---|---|
| AWS Region | `ap-southeast-1` |
| VPC | `nexusoms-demo-vpc` |
| VPC CIDR | `10.80.0.0/16` |
| Public subnet A | `nexusoms-demo-public-a` — `10.80.0.0/24` — `ap-southeast-1a` |
| Public subnet B | `nexusoms-demo-public-b` — `10.80.1.0/24` — `ap-southeast-1b` |
| Private subnet A | `nexusoms-demo-private-a` — `10.80.10.0/24` — `ap-southeast-1a` |
| Private subnet B | `nexusoms-demo-private-b` — `10.80.11.0/24` — `ap-southeast-1b` |
| Internet Gateway | `nexusoms-demo-igw` |
| Public route table | `nexusoms-demo-public-rt` |
| Private route table A | `nexusoms-demo-private-a-rt` |
| Private route table B | `nexusoms-demo-private-b-rt` |
| NAT Gateway A/B | `nexusoms-demo-nat-a`, `nexusoms-demo-nat-b` |
| ALB security group | `nexusoms-demo-alb-sg` |
| ECS task security group | `nexusoms-demo-task-sg` |
| ALB | `nexusoms-demo-alb` |
| Target group | `nexusoms-demo-api-tg` |
| ECR repository | `nexusoms-demo-api` |
| ECS cluster | `nexusoms-demo-cluster` |
| Task definition family | `nexusoms-demo-api` |
| Container name | `api` |
| ECS service | `nexusoms-demo-api-service` |
| Container port | `8080` |
| Health check | `/health` |
| Secret | `nexusoms/demo/application` |
| Log group | `/ecs/nexusoms-demo-api` |
| Audit bucket | `<AUDIT_BUCKET_NAME>` — ghi lại sau khi tạo CloudTrail |
| CloudTrail trail | `nexusoms-demo-trail` |
| ALB log prefix | `alb-access` |

PowerShell variables dùng trong các lệnh sau:

```powershell
$AwsRegion = "ap-southeast-1"
$AwsProfile = "nexusoms-demo"
$AccountId = aws sts get-caller-identity --profile $AwsProfile --query Account --output text
$EcrRepository = "nexusoms-demo-api"
$ImageTag = "v1-initial"
$EcrUri = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$EcrRepository"
$AuditBucketName = "<AUDIT_BUCKET_NAME>"
```

---

## 2. Chuẩn bị source code và Supabase

### 2.1 Clone source code

Mở PowerShell tại thư mục muốn lưu project:

```powershell
git clone https://github.com/ThanhBinhDuongNguyen/nexus-aws.git
cd nexus-aws
git status
```

Kết quả cần đạt: `git status` không báo conflict.

Nếu người thực hành muốn dùng repository riêng:

1. GitHub → **New repository**.
2. Đặt tên, ví dụ `nexusoms-workshop`.
3. Không chọn tạo README, `.gitignore` hoặc license vì source đã có sẵn.
4. Đổi remote và push:

```powershell
git remote rename origin upstream
git remote add origin https://github.com/<GITHUB_USER>/nexusoms-workshop.git
git push -u origin main
```

### 2.2 Tạo Supabase project

1. Mở Supabase Dashboard → **New project**.
2. Chọn organization.
3. Nhập tên project, tạo database password mạnh và lưu password vào password manager.
4. Chọn region gần Singapore nếu có.
5. Chờ project ở trạng thái hoạt động.

Lấy các giá trị:

- **Project Settings → API**: Project URL và publishable/anon key.
- **Connect → Session pooler**: PostgreSQL connection string dùng port `5432`.
- Không commit database password hoặc connection string lên Git.

Ví dụ connection string cho Npgsql:

```text
Host=<SESSION_POOLER_HOST>;Port=5432;Database=postgres;Username=<POOLER_USERNAME>;Password=<DATABASE_PASSWORD>;SSL Mode=Require;Trust Server Certificate=true
```

### 2.3 Chạy migration

Đăng nhập và liên kết Supabase CLI:

```powershell
npx supabase@latest login
npx supabase@latest link --project-ref <PROJECT_REF>
npx supabase@latest db push --remote
```

Nếu migration báo cột đã tồn tại, không sửa database ngẫu nhiên. So sánh bảng migration trên remote với folder `supabase/migrations` trước khi tiếp tục.

### 2.4 Tạo tài khoản đăng nhập và profile

1. Supabase → **Authentication → Users → Add user**.
2. Tạo email và password demo.
3. Lấy UUID của user.
4. Kiểm tra bảng `public.profiles` có bản ghi cùng UUID.
5. Đặt role hợp lệ, ví dụ `manager`.

UUID profile này cũng có thể dùng làm `systemActorId` cho Webhook Simulator.

### 2.5 Kiểm tra local trước khi tạo AWS

Backend:

```powershell
dotnet restore backend/src/NexusOMS.Api/NexusOMS.Api.csproj
dotnet build backend/src/NexusOMS.Api/NexusOMS.Api.csproj -c Release
dotnet test backend/tests/NexusOMS.ApiTests/NexusOMS.ApiTests.csproj -c Release
```

Frontend:

```powershell
cd frontend
npm ci
npm run typecheck
npm run test
npm run build
cd ..
```

Docker:

```powershell
docker build --file backend/Dockerfile --tag nexusoms-api:local-check backend
```

Không cần `cd backend` khi dùng đúng lệnh trên. Build context là đối số `backend` ở cuối lệnh.

### Checkpoint 1

Chỉ chuyển sang AWS khi:

- Backend build và test thành công.
- Frontend typecheck, test và build thành công.
- Docker image local build thành công.
- Supabase có migration, user và profile hợp lệ.

---

## 3. Đăng nhập AWS CLI an toàn

### 3.1 Tạo IAM user phục vụ thao tác lab

Trong AWS Console:

1. IAM → **Users → Create user**.
2. User name:

```text
nexusoms-demo-deployer
```

3. Chỉ cấp quyền cần cho lab. Nếu dùng `AdministratorAccess` để tiết kiệm thời gian cho tài khoản lab, phải xóa user/access key ngay sau khi hoàn tất.
4. Tạo access key cho **Command Line Interface (CLI)**.
5. Không chụp hoặc đưa secret access key vào tài liệu công khai.

Cấu hình profile:

```powershell
aws configure --profile nexusoms-demo
$env:AWS_PROFILE = "nexusoms-demo"
aws sts get-caller-identity --profile nexusoms-demo --region ap-southeast-1
```

### Checkpoint 2

Lệnh `get-caller-identity` phải trả về đúng AWS Account ID và ARN của user lab.

---

## 4. Tạo mạng AWS

### 4.1 Tạo VPC

VPC → **Your VPCs → Create VPC**:

- Resources to create: `VPC only`
- Name tag:

```text
nexusoms-demo-vpc
```

- IPv4 CIDR:

```text
10.80.0.0/16
```

- IPv6 CIDR block: `No IPv6 CIDR block`
- Tenancy: `Default`

Sau khi tạo, mở **Actions → Edit VPC settings** và bật cả DNS resolution lẫn DNS hostnames.

Ảnh minh họa đặt ngay sau bước này:

```text
/images/5-Workshop/nexusoms/5.3-Infrastructure/vpc/
```

### 4.2 Tạo bốn subnet

VPC → **Subnets → Create subnet**. Tất cả thuộc `nexusoms-demo-vpc`.

| Name | AZ | CIDR |
|---|---|---|
| `nexusoms-demo-public-a` | `ap-southeast-1a` | `10.80.0.0/24` |
| `nexusoms-demo-public-b` | `ap-southeast-1b` | `10.80.1.0/24` |
| `nexusoms-demo-private-a` | `ap-southeast-1a` | `10.80.10.0/24` |
| `nexusoms-demo-private-b` | `ap-southeast-1b` | `10.80.11.0/24` |

Hai public subnet phải ở **hai Availability Zone khác nhau**. ALB không chấp nhận hai subnet cùng AZ.

Sau khi tạo:

- Chọn public A → **Actions → Edit subnet settings** → bật `Enable auto-assign public IPv4 address`.
- Làm lại với public B.
- Không bật auto-assign public IPv4 cho private A/B.
- Có thể bật **Block Public Access** cho private subnet; đây là lựa chọn an toàn và không cản ECS private task.

### 4.3 Internet Gateway và public route table

1. VPC → **Internet gateways → Create internet gateway**.
2. Name:

```text
nexusoms-demo-igw
```

3. Chọn IGW → **Actions → Attach to a VPC** → chọn `nexusoms-demo-vpc`.
4. VPC → **Route tables → Create route table**:

```text
nexusoms-demo-public-rt
```

5. Mở route table → **Routes → Edit routes → Add route**:

```text
Destination: 0.0.0.0/0
Target: Internet Gateway → nexusoms-demo-igw
```

6. **Subnet associations → Edit subnet associations** → chọn cả public A và public B.

Đây là bước bắt buộc. Nếu ALB báo `IGW (missing)`, public subnet chưa được liên kết đúng route table này.

### 4.4 Tạo hai Elastic IP và hai NAT Gateway

EC2 → **Elastic IP addresses → Allocate Elastic IP address**, tạo hai địa chỉ:

```text
nexusoms-demo-nat-a-eip
nexusoms-demo-nat-b-eip
```

VPC → **NAT gateways → Create NAT gateway**:

NAT A:

```text
Name: nexusoms-demo-nat-a
Subnet: nexusoms-demo-public-a
Connectivity type: Public
Elastic IP: nexusoms-demo-nat-a-eip
```

NAT B:

```text
Name: nexusoms-demo-nat-b
Subnet: nexusoms-demo-public-b
Connectivity type: Public
Elastic IP: nexusoms-demo-nat-b-eip
```

Chờ cả hai có trạng thái `Available` rồi mới tạo private routes.

### 4.5 Private route tables

Tạo hai route table:

Private A:

```text
Name: nexusoms-demo-private-a-rt
Route: 0.0.0.0/0 → nexusoms-demo-nat-a
Subnet association: nexusoms-demo-private-a
```

Private B:

```text
Name: nexusoms-demo-private-b-rt
Route: 0.0.0.0/0 → nexusoms-demo-nat-b
Subnet association: nexusoms-demo-private-b
```

Không trỏ private A sang NAT B hoặc ngược lại trong kiến trúc demo hai AZ.

### 4.6 S3 Gateway Endpoint

VPC → **Endpoints → Create endpoint**:

- Service category: `AWS services`
- Service: `com.amazonaws.ap-southeast-1.s3`
- Type: `Gateway`
- VPC: `nexusoms-demo-vpc`
- Route tables: chọn cả private A route table và private B route table.
- Policy: `Full access` cho lab.

### Checkpoint 3

Xác nhận:

- Public A/B có route `0.0.0.0/0 → IGW`.
- Private A có route `0.0.0.0/0 → NAT A`.
- Private B có route `0.0.0.0/0 → NAT B`.
- NAT A/B là `Available`.
- S3 Gateway Endpoint liên kết với hai private route table.

---

## 5. Security Group

### 5.1 ALB Security Group

VPC → **Security groups → Create security group**:

```text
Name: nexusoms-demo-alb-sg
Description: Public entry for NexusOMS ALB
VPC: nexusoms-demo-vpc
```

Lấy ID của AWS managed prefix list dành cho CloudFront:

```powershell
$CloudFrontPrefixListId = (
  aws ec2 describe-managed-prefix-lists `
    --profile nexusoms-demo `
    --region ap-southeast-1 `
    --filters "Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing" `
    --query "PrefixLists[0].PrefixListId" `
    --output text
).Trim()

$CloudFrontPrefixListId
```

Inbound:

```text
Type: HTTP
Port: 80
Source type: Custom
Source: <CLOUDFRONT_PREFIX_LIST_ID>
```

Outbound: giữ `All traffic → 0.0.0.0/0`.

### 5.2 ECS Task Security Group

```text
Name: nexusoms-demo-task-sg
Description: Allow ALB to reach NexusOMS API tasks
VPC: nexusoms-demo-vpc
```

Inbound:

```text
Type: Custom TCP
Port: 8080
Source type: Custom
Source: nexusoms-demo-alb-sg
```

Outbound: `All traffic → 0.0.0.0/0`.

Không gắn `nexusoms-demo-task-sg` vào ALB. ALB phải dùng `nexusoms-demo-alb-sg`; ECS task dùng `nexusoms-demo-task-sg`.

### Checkpoint 4

- ALB SG nhận HTTP 80 từ `com.amazonaws.global.cloudfront.origin-facing`.
- Task SG chỉ nhận TCP 8080 từ ALB SG.
- Hai SG cùng thuộc `nexusoms-demo-vpc`.

---

## 6. Secrets Manager, CloudWatch Logs, IAM và audit logs

### 6.1 Tạo secret

Secrets Manager → **Store a new secret**:

- Secret type: `Other type of secret`
- Chọn `Plaintext` và nhập JSON:

```json
{
  "postgresConnectionString": "Host=<SESSION_POOLER_HOST>;Port=5432;Database=postgres;Username=<POOLER_USERNAME>;Password=<DATABASE_PASSWORD>;SSL Mode=Require;Trust Server Certificate=true",
  "supabaseUrl": "https://<PROJECT_REF>.supabase.co",
  "systemActorId": "<PROFILE_UUID>",
  "webhookSigningSecret": "<RANDOM_SECRET_AT_LEAST_32_CHARACTERS>"
}
```

Tên secret:

```text
nexusoms/demo/application
```

`webhookSigningSecret` có thể là chuỗi tự tạo nhưng phải khó đoán, ít nhất 32 ký tự và không dùng lại password.

Sao chép ARN đầy đủ của secret. ARN có hậu tố ngẫu nhiên, ví dụ:

```text
arn:aws:secretsmanager:ap-southeast-1:<ACCOUNT_ID>:secret:nexusoms/demo/application-AbCdEf
```

### 6.2 Tạo CloudWatch Log Group

CloudWatch → **Log management → Create log group**:

```text
/ecs/nexusoms-demo-api
```

Retention: `7 days` hoặc `14 days` cho demo.

### 6.3 ECS execution role

IAM → **Roles → Create role**:

- Trusted entity type: `AWS service`
- Use case: `Elastic Container Service → Elastic Container Service Task`
- Role name:

```text
nexusoms-demo-ecs-execution-role
```

Gắn managed policy:

```text
AmazonECSTaskExecutionRolePolicy
```

Sau đó role → **Add permissions → Create inline policy → JSON**, thay `<SECRET_ARN>` bằng ARN đã copy:

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

Policy name:

```text
ReadNexusOmsApplicationSecret
```

### 6.4 ECS task role

IAM → **Roles → Create role**:

```text
Trusted entity type: AWS service
Use case: Elastic Container Service → Elastic Container Service Task
```

Không chọn permissions policy. Role name:

```text
nexusoms-demo-ecs-task-role
```

Task role không cần policy ứng dụng.

### 6.5 Tạo CloudTrail và S3 audit bucket

CloudTrail → **Trails → Create trail**:

```text
Trail name: nexusoms-demo-trail
Storage location: Create new S3 bucket
Log file SSE-KMS encryption: Disabled
Log file validation: Enabled
CloudWatch Logs: Disabled
```

Trong **Choose log events**, chỉ chọn:

```text
Event type: Management events
API activity: Read và Write
Exclude AWS KMS events: giữ mặc định
Exclude Amazon RDS Data API events: giữ mặc định
```

Không bật **Data events**, **Insights events** hoặc **Network activity events**.

CloudTrail tạo S3 bucket và bucket policy tại bước này. Sau khi trail hoạt động:

1. Mở trail và ghi lại tên S3 bucket thực tế. Dùng tên này thay cho `<AUDIT_BUCKET_NAME>` ở các bước sau.
2. Mở S3 bucket vừa ghi lại.
3. Xác nhận **Block all public access** đang bật.
4. Xác nhận **Default encryption** là **Server-side encryption with Amazon S3 managed keys (SSE-S3)**.
5. Sau vài phút, kiểm tra bucket có prefix `AWSLogs/<ACCOUNT_ID>/CloudTrail/`.

Giữ nguyên các statement CloudTrail trong bucket policy. Thêm quyền ghi ALB tại mục 8.2.

---

## 7. ECR và backend image lần đầu

### 7.1 Tạo ECR repository

ECR → **Private registry → Repositories → Create repository**:

- Repository name:

```text
nexusoms-demo-api
```

- Image tag mutability: `Immutable`
- Encryption: `AES-256`
- Scan on push: bật nếu giao diện còn cung cấp; nếu phần này chuyển sang registry-level configuration thì giữ mặc định và cấu hình sau ở **Private registry → Features & Settings**.

### 7.2 Build và push image

Chạy từ root repository:

```powershell
$AwsRegion = "ap-southeast-1"
$AwsProfile = "nexusoms-demo"
$AccountId = aws sts get-caller-identity --profile $AwsProfile --query Account --output text
$EcrRepository = "nexusoms-demo-api"
$ImageTag = "v1-initial"
$EcrUri = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$EcrRepository"

aws ecr get-login-password --region $AwsRegion --profile $AwsProfile |
  docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com"

docker build --file backend/Dockerfile --tag "nexusoms-api:$ImageTag" backend
docker tag "nexusoms-api:$ImageTag" "$EcrUri`:$ImageTag"
docker push "$EcrUri`:$ImageTag"
```

ECR → repository → Images phải có tag `v1-initial`.

> Dockerfile backend phải cài `libgssapi-krb5-2`. Nếu CloudWatch báo `Cannot load library libgssapi_krb5.so.2`, image đang dùng là bản cũ hoặc Dockerfile chưa có package này.

---

## 8. Target Group, ALB, ECS Cluster và Task Definition

### 8.1 Target Group

EC2 → **Target groups → Create target group**:

```text
Target type: IP addresses
Name: nexusoms-demo-api-tg
Protocol: HTTP
Port: 8080
VPC: nexusoms-demo-vpc
IP address type: IPv4
Health check protocol: HTTP
Health check path: /health
```

Không đăng ký IP thủ công; ECS service sẽ tự đăng ký task.

### 8.2 Application Load Balancer

EC2 → **Load balancers → Create Application Load Balancer**:

```text
Name: nexusoms-demo-alb
Scheme: Internet-facing
IP address type: IPv4
VPC: nexusoms-demo-vpc
```

Availability Zones and subnets:

- `ap-southeast-1a` → `nexusoms-demo-public-a`
- `ap-southeast-1b` → `nexusoms-demo-public-b`

Security group:

```text
nexusoms-demo-alb-sg
```

Listener:

```text
HTTP : 80 → Forward to nexusoms-demo-api-tg
```

Nếu console báo `IGW (missing)`, quay lại public route table; không bỏ qua cảnh báo.

#### 8.2.1 Bật ALB access logs vào audit bucket

Mở S3 → `<AUDIT_BUCKET_NAME>` → **Permissions → Bucket policy → Edit**.

Giữ nguyên các statement CloudTrail đã tạo. Thêm statement sau vào mảng `Statement`. Thay `<AUDIT_BUCKET_NAME>` và `<ACCOUNT_ID>` bằng giá trị thật:

```json
{
  "Sid": "AllowAlbAccessLogDelivery",
  "Effect": "Allow",
  "Principal": {
    "Service": "logdelivery.elasticloadbalancing.amazonaws.com"
  },
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::<AUDIT_BUCKET_NAME>/alb-access/AWSLogs/<ACCOUNT_ID>/*",
  "Condition": {
    "StringEquals": {
      "aws:SourceAccount": "<ACCOUNT_ID>"
    },
    "ArnLike": {
      "aws:SourceArn": "arn:aws:elasticloadbalancing:ap-southeast-1:<ACCOUNT_ID>:loadbalancer/*"
    }
  }
}
```

Lưu policy, sau đó mở EC2 → **Load balancers → nexusoms-demo-alb → Attributes → Edit**:

```text
Logging → Access logs: Enabled
S3 URI: s3://<AUDIT_BUCKET_NAME>/alb-access
```

Chọn **Save changes**. ALB sẽ kiểm tra quyền ghi vào bucket. Mở bucket và xác nhận xuất hiện:

```text
alb-access/AWSLogs/<ACCOUNT_ID>/ELBAccessLogTestFile
```

Nếu báo `Access Denied`, kiểm tra tên bucket, prefix, Account ID, Region `ap-southeast-1` và SSE-S3.

### 8.3 ECS Cluster

ECS → **Clusters → Create cluster**:

```text
nexusoms-demo-cluster
```

Container Insights: không bật.

### 8.4 Task Definition

ECS → **Task definitions → Create new task definition**:

```text
Family: nexusoms-demo-api
Launch type: AWS Fargate
Operating system: Linux/X86_64
Task CPU: 0.5 vCPU (512 CPU units)
Task memory: 1 GB
Task execution role: nexusoms-demo-ecs-execution-role
Task role: nexusoms-demo-ecs-task-role
```

Không đảo hai role. Execution role dùng để pull image, ghi log và lấy secret. Task role dành cho AWS API mà ứng dụng gọi khi đang chạy.

Container:

```text
Name: api
Image URI: <ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com/nexusoms-demo-api:v1-initial
Container port: 8080 TCP
```

Plain environment variable:

```text
ASPNETCORE_ENVIRONMENT = Production
ASPNETCORE_HTTP_PORTS = 8080
```

Secrets phải chọn **ValueFrom**, nhưng Value không phải chỉ là tên secret. Dùng ARN đầy đủ cộng JSON key:

```text
ConnectionStrings__Postgres
<SECRET_ARN>:postgresConnectionString::

Supabase__Url
<SECRET_ARN>:supabaseUrl::

WebhookSimulator__SystemActorId
<SECRET_ARN>:systemActorId::

WebhookSimulator__Secret
<SECRET_ARN>:webhookSigningSecret::
```

Ví dụ hoàn chỉnh:

```text
arn:aws:secretsmanager:ap-southeast-1:123456789012:secret:nexusoms/demo/application-AbCdEf:postgresConnectionString::
```

Nếu console báo “Systems Manager parameter name ... is invalid”, ValueFrom đang được nhập sai loại hoặc thiếu ARN. Chọn Secrets Manager và dùng đúng chuỗi ARN + JSON key phía trên.

`Frontend__Origin` là biến tùy chọn khi frontend và API cùng đi qua một CloudFront domain. Nếu cần cấu hình biến này sau khi đã có CloudFront, đặt giá trị thành `https://<CLOUDFRONT_DOMAIN>`, tạo revision mới của task definition rồi triển khai revision đó cho ECS service.

Logging:

```text
Log driver: awslogs
Log group: /ecs/nexusoms-demo-api
Region: ap-southeast-1
Stream prefix: ecs
```

### 8.5 ECS Service

Trong cluster → **Create service**:

```text
Compute option: Launch type
Launch type: FARGATE
Application type: Service
Task definition family: nexusoms-demo-api
Revision: latest
Service name: nexusoms-demo-api-service
Desired tasks: 1
```

Networking:

```text
VPC: nexusoms-demo-vpc
Subnets: nexusoms-demo-private-a, nexusoms-demo-private-b
Security group: nexusoms-demo-task-sg
Public IP: Turned off
```

Load balancing:

```text
Load balancer type: Application Load Balancer
Existing ALB: nexusoms-demo-alb
Listener: HTTP 80
Target group: nexusoms-demo-api-tg
Container: api:8080
```

Chờ service đạt:

```text
Desired: 1
Running: 1
Target group: Healthy
```

### Checkpoint 5

EC2 → **Target groups → nexusoms-demo-api-tg → Targets** phải hiển thị `Healthy: 1` và `Unhealthy: 0`.

Kiểm tra theo thứ tự:

1. ECS task `Running`.
2. Target Group dùng health check path chính xác `/health`.
3. Task SG inbound 8080 từ ALB SG.
4. ALB SG inbound 80 từ CloudFront managed prefix list.
5. CloudWatch log của container.
6. Secret ARN/JSON key và database connection string.

### Điểm kiểm tra trước khi triển khai frontend

- Có đủ bốn subnet trên hai Availability Zone: hai public subnet và hai private subnet.
- Public route table có route `0.0.0.0/0` đến Internet Gateway.
- Private route table A/B có route `0.0.0.0/0` lần lượt đến NAT Gateway A/B.
- ALB sử dụng cả hai public subnet và `nexusoms-demo-alb-sg`.
- ECS service sử dụng cả hai private subnet và `nexusoms-demo-task-sg`.
- Task security group cho phép TCP `8080` từ ALB security group.
- Target group báo `Healthy` với health check path `/health`.
- Các secret trong task definition dùng ARN đầy đủ kèm đúng JSON key.

---

## 9. Frontend trên S3 và CloudFront

### 9.1 Tạo S3 bucket riêng tư

S3 → **Create bucket**:

```text
nexusoms-demo-frontend-<ACCOUNT_ID>
```

- Region: `ap-southeast-1`
- Block all public access: bật.
- Object ownership: Bucket owner enforced.
- S3 static website hosting: không bật.

### 9.2 Build frontend lần đầu

Tạo `frontend/.env.production.local` trên máy cá nhân; file này phải bị Git ignore:

```dotenv
VITE_DATA_MODE=supabase
VITE_API_BASE_URL=http://<ALB_DNS_NAME>
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<SUPABASE_PUBLISHABLE_OR_ANON_KEY>
```

Build và upload:

```powershell
cd frontend
npm ci
npm run build
aws s3 sync dist "s3://nexusoms-demo-frontend-$AccountId" --delete --profile $AwsProfile --region $AwsRegion
cd ..
```

Giá trị `VITE_*` được đóng vào JavaScript lúc build. Thay biến trên S3 không làm bundle cũ đổi theo; phải build lại.

Đây là bản build ban đầu. Sau khi tạo CloudFront, build lại theo mục 9.7 với `VITE_API_BASE_URL=https://<CLOUDFRONT_DOMAIN>`.

### 9.3 Tạo CloudFront distribution với S3 origin

CloudFront → **Create distribution**:

```text
Distribution name: nexusoms-demo-web
Distribution type: Single website configuration
Route 53 managed domain: để trống
Origin type: Amazon S3
S3 origin: nexusoms-demo-frontend-<ACCOUNT_ID>
Origin path: để trống
Allow private S3 bucket access to CloudFront: bật
Origin settings: recommended
Cache settings: recommended for S3
WAF: Do not enable security protections
TLS certificate: dùng CloudFront default certificate
```

Default root object:

```text
index.html
```

### 9.4 Thêm ALB origin

Distribution → **Origins → Create origin**:

```text
Origin domain: <ALB_DNS_NAME>
Protocol: HTTP only
HTTP port: 80
Name: nexusoms-demo-alb-origin
```

Không tạo OAC cho ALB. OAC chỉ dùng cho S3 origin trong kiến trúc này.

### 9.5 Tạo behavior `/api/*`

Distribution → **Behaviors → Create behavior**:

```text
Path pattern: /api/*
Origin: nexusoms-demo-alb-origin
Compress objects automatically: Yes
Viewer protocol policy: Redirect HTTP to HTTPS
Allowed methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
Restrict viewer access: No
Cache policy: Managed-CachingDisabled
Origin request policy: Managed-AllViewerExceptHostHeader
```

Behavior `/api/*` phải có precedence cao hơn default `*`.

### 9.6 CloudFront Function cho React SPA

Nếu người dùng mở trực tiếp `/app?page=dashboard`, S3 không có object tên `/app` và trả `AccessDenied`. Tạo function để rewrite route không có phần mở rộng về `/index.html`.

CloudFront → **Functions → Create function**:

```text
Name: nexusoms-demo-spa-rewrite
Runtime: cloudfront-js-2.0
```

Code:

```javascript
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri === '/api' || uri.indexOf('/api/') === 0) {
    return request;
  }

  var lastSlash = uri.lastIndexOf('/');
  var lastSegment = uri.substring(lastSlash + 1);
  var hasExtension = lastSegment.indexOf('.') !== -1;

  if (uri === '/' || uri.charAt(uri.length - 1) === '/' || !hasExtension) {
    request.uri = '/index.html';
  }

  return request;
}
```

1. Save changes.
2. Publish function.
3. Distribution → default behavior `*` → Edit.
4. Function associations → Viewer request → chọn `nexusoms-demo-spa-rewrite`.
5. Save và chờ distribution `Deployed`.

Không gắn function này vào `/api/*`.

Có thể thêm custom error responses như lớp dự phòng:

```text
HTTP 403 → /index.html → 200
HTTP 404 → /index.html → 200
```

### 9.7 Build lại frontend bằng CloudFront domain

Sau khi có distribution domain, sửa:

```dotenv
VITE_API_BASE_URL=https://<CLOUDFRONT_DOMAIN>
```

Không thêm `/api` ở cuối vì frontend đã gọi các path `/api/v1/...`.

Build, upload và invalidate:

```powershell
cd frontend
npm run build
aws s3 sync dist "s3://nexusoms-demo-frontend-$AccountId" --delete --profile $AwsProfile --region $AwsRegion
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*" --profile $AwsProfile
cd ..
```

### Checkpoint 6

Kiểm tra:

```text
https://<CLOUDFRONT_DOMAIN>/
https://<CLOUDFRONT_DOMAIN>/app
https://<CLOUDFRONT_DOMAIN>/app?page=dashboard
https://<CLOUDFRONT_DOMAIN>/api/v1/session/me
```

Endpoint session chưa có token phải trả 401, không phải 403/404/500.

---

## 10. Kiểm thử end-to-end

1. Mở CloudFront URL và đăng nhập bằng Supabase user.
2. DevTools → Network → kiểm tra `GET /api/v1/session/me` trả 200.
3. Kiểm tra Brand, Product và Warehouse.
4. Tạo hoặc chọn SKU mapping.
5. Mở mô phỏng Flash Sale, tạo đơn và chạy từng bước webhook.
6. Kiểm tra đơn, tồn khả dụng, tồn đang giữ và hiệu quả kênh.
7. Mở CloudWatch log để đối chiếu request và lỗi backend.
8. Mở target group để xác nhận target vẫn Healthy.
9. Mở CloudTrail → Event history hoặc S3 audit bucket để xác nhận management events được ghi nhận.
10. Gửi vài request qua CloudFront `/api/*`, chờ ALB phân phối log rồi kiểm tra prefix `alb-access/AWSLogs/<ACCOUNT_ID>/`.

Các lỗi thường gặp:

| Triệu chứng | Nguyên nhân cần kiểm tra |
|---|---|
| ALB cảnh báo reachability | Gắn nhầm task SG vào ALB hoặc ALB SG thiếu inbound 80 |
| `IGW (missing)` | Public subnet chưa liên kết public route table có route IGW |
| ECS task không pull image | Private route/NAT chưa đúng hoặc execution role thiếu ECR policy |
| Secret/SSM parameter invalid | ValueFrom không dùng ARN đầy đủ + JSON key |
| API 500 và Npgsql Host null | Secret mapping sai hoặc connection string thiếu Host |
| `libgssapi_krb5.so.2` | Backend image cũ hoặc Dockerfile chưa cài package |
| `/app?...` AccessDenied | CloudFront Function chưa publish/associate với default behavior |
| `/api/...` trả S3 403/405 | Thiếu behavior `/api/*` hoặc origin đang là S3 |
| Session 401 sau đăng nhập | JWT không được forward hoặc Supabase URL/token không cùng project |
| Frontend vẫn gọi localhost | Bundle được build trước khi đặt `VITE_API_BASE_URL` |
| Webhook 409 | Trùng idempotency/order, thiếu tồn hoặc sai thứ tự trạng thái; tạo kịch bản mới và đọc response body |

---

## 11. Thêm CI/CD GitHub Actions

Chỉ thực hiện phần này sau khi triển khai thủ công đã chạy end-to-end. CI/CD thay thế việc build/push/deploy thủ công cho các lần cập nhật, không thay thế bước tạo hạ tầng ban đầu.

### 11.1 Tạo GitHub OIDC provider trong AWS

IAM → **Identity providers → Add provider**:

```text
Provider type: OpenID Connect
Provider URL: https://token.actions.githubusercontent.com
Audience: sts.amazonaws.com
```

### 11.2 Tạo IAM role cho GitHub Actions

IAM → **Roles → Create role → Web identity**:

```text
Identity provider: token.actions.githubusercontent.com
Audience: sts.amazonaws.com
GitHub organization: <GITHUB_OWNER>
GitHub repository: <GITHUB_REPOSITORY>
GitHub branch: main
```

Chọn **Next**. Tại **Add permissions**, chọn **Create inline policy → JSON** và dùng policy bên dưới.

Repository GitHub mới dùng immutable owner ID và repository ID trong OIDC subject. Lấy subject chính xác:

```powershell
gh auth status
$GitHubOwner = "<GITHUB_OWNER>"
$GitHubRepository = "<GITHUB_REPOSITORY>"
$RepoInfo = gh api "repos/$GitHubOwner/$GitHubRepository" | ConvertFrom-Json
$OidcSubject = "repo:$($RepoInfo.owner.login)@$($RepoInfo.owner.id)/$($RepoInfo.name)@$($RepoInfo.id):ref:refs/heads/main"
$OidcSubject
```

Nếu `gh auth status` chưa đăng nhập, chạy `gh auth login` rồi thực hiện lại.

Sau khi tạo role, mở **Trust relationships → Edit trust policy**. Thay `<ACCOUNT_ID>` và `<OIDC_SUBJECT>`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "<OIDC_SUBJECT>"
        }
      }
    }
  ]
}
```

Trong inline policy, thay `<ACCOUNT_ID>` và `<DISTRIBUTION_ID>` bằng giá trị thật:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EcrLogin",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "PushBackendImage",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:CompleteLayerUpload",
        "ecr:GetDownloadUrlForLayer",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": "arn:aws:ecr:ap-southeast-1:<ACCOUNT_ID>:repository/nexusoms-demo-api"
    },
    {
      "Sid": "RegisterTaskDefinition",
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DeployEcsService",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices"
      ],
      "Resource": "arn:aws:ecs:ap-southeast-1:<ACCOUNT_ID>:service/nexusoms-demo-cluster/nexusoms-demo-api-service"
    },
    {
      "Sid": "PassEcsRoles",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::<ACCOUNT_ID>:role/nexusoms-demo-ecs-execution-role",
        "arn:aws:iam::<ACCOUNT_ID>:role/nexusoms-demo-ecs-task-role"
      ],
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "ecs-tasks.amazonaws.com"
        }
      }
    },
    {
      "Sid": "ListFrontendBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": "arn:aws:s3:::nexusoms-demo-frontend-<ACCOUNT_ID>"
    },
    {
      "Sid": "DeployFrontendObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::nexusoms-demo-frontend-<ACCOUNT_ID>/*"
    },
    {
      "Sid": "InvalidateCloudFront",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "arn:aws:cloudfront::<ACCOUNT_ID>:distribution/<DISTRIBUTION_ID>"
    }
  ]
}
```

Lưu inline policy với tên:

```text
DeployNexusOmsFromGitHub
```

Role name:

```text
nexusoms-demo-github-actions-role
```

Không lưu AWS access key trong GitHub Secrets.

### 11.3 GitHub repository variables và secrets

GitHub → repository → **Settings → Secrets and variables → Actions**.

Tab **Variables** → phần **Repository variables** → **New repository variable**. Không dùng phần **Environment variables**.

Variables:

```text
AWS_REGION=ap-southeast-1
ECR_REPOSITORY=nexusoms-demo-api
ECS_CLUSTER=nexusoms-demo-cluster
ECS_SERVICE=nexusoms-demo-api-service
ECS_TASK_DEFINITION=nexusoms-demo-api
CONTAINER_NAME=api
S3_BUCKET=nexusoms-demo-frontend-<ACCOUNT_ID>
CLOUDFRONT_DISTRIBUTION_ID=<DISTRIBUTION_ID>
CLOUDFRONT_DOMAIN=<DOMAIN>.cloudfront.net
```

Tab **Secrets** → phần **Repository secrets** → **New repository secret**.

Secrets:

```text
AWS_ROLE_TO_ASSUME=arn:aws:iam::<ACCOUNT_ID>:role/nexusoms-demo-github-actions-role
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<SUPABASE_PUBLISHABLE_OR_ANON_KEY>
```

Supabase publishable/anon key được thiết kế để dùng ở browser nhưng vẫn đặt trong GitHub Secret để quản lý cấu hình build. Không bao giờ đưa service-role key vào frontend.

### 11.4 Workflow hợp nhất

Workflow cũ `.github/workflows/cd.yml` publish image lên GHCR. Workflow AWS mới deploy backend lên ECR/ECS và frontend lên S3/CloudFront. Đổi đuôi workflow cũ để mỗi lần push chỉ chạy một pipeline:

```powershell
if (Test-Path ".github/workflows/cd.yml") {
  Rename-Item ".github/workflows/cd.yml" "cd-ghcr.yml.disabled"
}
```

Giữ `backend-ci.yml` và `frontend-ci.yml`.

Tạo `.github/workflows/deploy-aws.yml`:

```yaml
name: Deploy NexusOMS to AWS

on:
  workflow_dispatch:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write

concurrency:
  group: nexusoms-production
  cancel-in-progress: false

jobs:
  backend-ci:
    uses: ./.github/workflows/backend-ci.yml

  frontend-ci:
    uses: ./.github/workflows/frontend-ci.yml

  deploy-backend:
    needs: [backend-ci, frontend-ci]
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.build-image.outputs.image }}
    steps:
      - name: Checkout source
        uses: actions/checkout@v4

      - name: Configure AWS credentials by OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: ${{ vars.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push immutable backend image
        id: build-image
        env:
          REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}-${{ github.run_attempt }}
        run: |
          IMAGE="$REGISTRY/${{ vars.ECR_REPOSITORY }}:$IMAGE_TAG"
          docker build --file backend/Dockerfile --tag "$IMAGE" backend
          docker push "$IMAGE"
          echo "image=$IMAGE" >> "$GITHUB_OUTPUT"

      - name: Download and sanitize current ECS task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition "${{ vars.ECS_TASK_DEFINITION }}" \
            --query taskDefinition > task-definition.raw.json
          jq 'del(
            .taskDefinitionArn,
            .revision,
            .status,
            .requiresAttributes,
            .compatibilities,
            .registeredAt,
            .registeredBy
          )' task-definition.raw.json > task-definition.json

      - name: Render task definition with new image
        id: render-task
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: ${{ vars.CONTAINER_NAME }}
          image: ${{ steps.build-image.outputs.image }}

      - name: Deploy ECS task definition
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: ${{ steps.render-task.outputs.task-definition }}
          service: ${{ vars.ECS_SERVICE }}
          cluster: ${{ vars.ECS_CLUSTER }}
          wait-for-service-stability: true

  deploy-frontend:
    needs: deploy-backend
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source
        uses: actions/checkout@v4

      - name: Configure AWS credentials by OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          aws-region: ${{ vars.AWS_REGION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install, check and build frontend
        working-directory: frontend
        env:
          VITE_DATA_MODE: supabase
          VITE_API_BASE_URL: https://${{ vars.CLOUDFRONT_DOMAIN }}
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: |
          npm ci
          npm run typecheck
          npm run test
          npm run build

      - name: Upload frontend to private S3 bucket
        run: |
          aws s3 sync frontend/dist "s3://${{ vars.S3_BUCKET }}" --delete

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id "${{ vars.CLOUDFRONT_DISTRIBUTION_ID }}" \
            --paths "/*"
```

Commit và push:

```powershell
git add -A .github/workflows
git commit -m "ci: deploy NexusOMS to AWS with GitHub OIDC"
git push origin main
```

### 11.5 Xác minh pipeline

Lệnh `git push origin main` tự chạy workflow. Mở GitHub → **Actions → Deploy NexusOMS to AWS** và chờ các job:

```text
Backend CI ─┐
            ├─> Deploy backend ─> Deploy frontend
Frontend CI ┘
```

Kiểm tra:

1. ECR có image tag mới.
2. ECS có task definition revision mới.
3. ECS service giữ `Running 1/1` và target `Healthy`.
4. Frontend được đồng bộ vào S3.
5. CloudFront invalidation có trạng thái `Completed`.
6. Website đăng nhập và gọi API thành công.

Nếu pipeline lỗi:

| Lỗi | Kiểm tra |
|---|---|
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` | Trust policy phải dùng đúng immutable `<OIDC_SUBJECT>` |
| ECR trả `403 Forbidden` khi kiểm tra manifest | Inline policy phải có `ecr:BatchGetImage` |

Rollback backend:

1. ECS → service → Update.
2. Chọn task definition revision trước đó.
3. Force new deployment.

Rollback frontend: checkout commit ổn định và chạy lại workflow, hoặc upload lại bundle đã lưu rồi invalidate CloudFront.

---

## 12. Dọn sạch tài nguyên AWS

Xóa theo đúng thứ tự để tránh dependency conflict.

### 12.1 CloudFront và S3

1. CloudFront distribution → Disable.
2. Chờ deployment hoàn tất → Delete distribution.
3. Xóa CloudFront Function sau khi không còn association.
4. Empty frontend S3 bucket.
5. Delete bucket.

### 12.2 ECS, ALB và ECR

1. ECS service → Update desired count về `0`.
2. Chờ task dừng → Delete service.
3. Delete ECS cluster.
4. Deregister task definition revisions nếu muốn dọn hoàn toàn.
5. ALB → Attributes → Edit → tắt **Access logs**.
6. Delete ALB; chờ trạng thái xóa xong.
7. Delete target group.
8. ECR repository → Delete; chọn force delete images nếu cần.

### 12.3 CloudTrail và S3 audit bucket

1. CloudTrail → Trails → `nexusoms-demo-trail` → **Stop logging**.
2. Delete trail `nexusoms-demo-trail`.
3. S3 → `<AUDIT_BUCKET_NAME>` → **Empty**.
4. Nếu bucket bật versioning, chọn xóa vĩnh viễn toàn bộ object versions và delete markers.
5. Delete audit bucket.

Không xóa audit bucket trước khi tắt ALB access logs và xóa trail.

### 12.4 Network

1. Delete S3 Gateway Endpoint.
2. Delete NAT Gateway A và B.
3. Chờ NAT ở trạng thái `Deleted`. NAT `Failed` sẽ tự biến mất; không thể bấm Delete khi AWS đang hoàn tất cleanup.
4. Release hai Elastic IP sau khi NAT đã xóa.
5. Delete private route table A/B.
6. Delete public route table.
7. Delete private và public subnets.
8. Detach Internet Gateway khỏi VPC rồi delete IGW.
9. Delete custom security groups.
10. Delete VPC.

### 12.5 Dịch vụ dùng chung

1. Delete secret `nexusoms/demo/application` nếu không dùng lại; chọn thời gian recovery phù hợp.
2. Delete CloudWatch log group `/ecs/nexusoms-demo-api`.
3. Delete GitHub Actions IAM role.
4. Delete ECS task/execution roles và inline policy.
5. Delete GitHub OIDC provider chỉ khi không repository nào khác dùng nó.
6. Delete IAM deployer user/access key.
7. Giữ hoặc xóa Supabase project theo mục tiêu bài lab; Supabase không bị xóa khi dọn AWS.

### 12.6 Kiểm tra chi phí sau cleanup

Kiểm tra lại:

- VPC → NAT Gateways.
- EC2 → Elastic IP addresses, Load Balancers, Target Groups.
- ECS → Clusters.
- ECR → Repositories.
- CloudFront → Distributions.
- S3 → Buckets.
- CloudTrail → Trails.
- Secrets Manager → Secrets.
- CloudWatch → Log groups.
- Billing → Cost Explorer và Free Tier.

Các tài nguyên dễ tiếp tục tính phí nếu bỏ sót: NAT Gateway, public IPv4/Elastic IP, ALB và dữ liệu/log còn lưu trong S3 hoặc CloudWatch.

---

## 13. Nguồn tham khảo chính thức

- GitHub OIDC với AWS: <https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services>
- Amazon ECS task execution role: <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html>
- Truyền secret vào ECS task: <https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html>
- Deploy ECS bằng GitHub Actions: <https://github.com/aws-actions/amazon-ecs-deploy-task-definition>
- CloudFront Functions: <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html>
- CloudFront OAC cho S3: <https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html>
- NAT Gateway: <https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html>
- S3 Gateway Endpoint: <https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html>
- Tạo CloudTrail trail: <https://docs.aws.amazon.com/awscloudtrail/latest/userguide/creating-a-trail-for-your-aws-account.html>
- Bật ALB access logs: <https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html>

---

## 14. Checklist chốt workshop

- [ ] Source clone được và không chứa secret.
- [ ] Supabase migration chạy thành công; user/profile đăng nhập được.
- [ ] Local build/test và Docker build thành công.
- [ ] Hai public subnet khác AZ và có IGW route.
- [ ] Hai private subnet có NAT route đúng AZ.
- [ ] ALB dùng ALB SG; task dùng task SG.
- [ ] Target group `/health` là Healthy.
- [ ] CloudTrail ghi management events vào S3 audit bucket.
- [ ] ALB access logs đã bật và bucket có `ELBAccessLogTestFile`.
- [ ] ECS task dùng ARN + JSON key đúng cho bốn secret mapping.
- [ ] S3 bucket private và CloudFront OAC hoạt động.
- [ ] `/api/*` đi ALB; default `*` đi S3.
- [ ] CloudFront Function xử lý route React trực tiếp.
- [ ] Đăng nhập, session, webhook, inventory và finance chạy end-to-end.
- [ ] GitHub Actions dùng OIDC, không dùng AWS access key.
- [ ] Pipeline tạo image SHA, task revision mới, sync S3 và invalidate CloudFront.
- [ ] Có ảnh Log, Metric, target health và pipeline thành công.
- [ ] Có dự toán chi phí và hướng dẫn cleanup.

