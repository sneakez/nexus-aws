# Hướng dẫn triển khai NexusOMS lên AWS bằng Console

## Từ source code local đến website demo trên Internet

Tài liệu này hướng dẫn một người triển khai NexusOMS trên AWS tại Singapore, bắt đầu từ source code trên máy Windows và kết thúc bằng việc đăng nhập, chạy thử nghiệp vụ, chụp bằng chứng và dọn tài nguyên sau buổi demo. Làm đúng thứ tự từng phần; mỗi phần đều có nơi mở, giá trị cần điền và dấu hiệu để biết đã xong.

Hệ thống dùng S3 và CloudFront cho frontend, ALB và ECS Fargate cho backend, Supabase cho PostgreSQL và Authentication. CloudFront là địa chỉ duy nhất mà trình duyệt truy cập. Không đưa database password, webhook secret, JWT hoặc Supabase service-role key vào Vite, Docker image, GitHub hay ảnh chụp báo cáo.

> **Đọc trước khi bắt đầu:** bản hướng dẫn cũ có một số giá trị bí mật ghi thẳng vào bảng. Không sao chép password hoặc secret từ bản cũ. Tài liệu này thay các giá trị đó bằng hướng dẫn lấy đúng giá trị tại nơi cấp. Vì database password đã từng xuất hiện trong bản cũ/chat, hãy đổi password đó trong Supabase rồi cập nhật secret AWS trước khi tiếp tục dùng môi trường demo.

## Quy ước đọc tài liệu

| Dạng giá trị | Ý nghĩa | Ví dụ |
|---|---|---|
| Giá trị cố định | Gõ đúng như tài liệu | `ap-southeast-1`, `10.80.0.0/16`, `nexusoms-demo-vpc` |
| Giá trị AWS cấp | Mở đúng màn hình AWS, copy nguyên giá trị | VPC ID, subnet ID, ARN, ECR URI, ALB DNS, CloudFront domain và Distribution ID |
| Giá trị Supabase cấp | Copy từ Supabase Dashboard hoặc truy vấn bảng | Project URL, Session pooler host, publishable key, profile UUID |
| Bí mật | Chỉ nhập vào Secrets Manager hoặc nơi được chỉ rõ; không chụp màn hình value | Database password, webhook signing secret, Supabase access token |

Trong các lệnh PowerShell, thay các chuỗi `<...>` bằng giá trị thật trước khi chạy. Không gõ dấu `<` và `>` vào lệnh. Các tên resource có tiền tố `nexusoms-demo-` phải được giữ giống nhau để tránh chọn nhầm.

## 1. Kiến trúc sẽ dựng

```text
Trình duyệt
    │ HTTPS
    ▼
CloudFront distribution
    ├── Default behavior (*) ──► S3 riêng tư (frontend React/Vite)
    │                              └── CloudFront Function đưa /app?... về /index.html
    └── /api/* ─────────────────► ALB (HTTP:80 trong bản demo)
                                      │ chuyển tiếp tới target group (HTTP:8080)
                                      ▼
                                  ECS Fargate task trong private subnet
                                      ├── NAT Gateway ──► Supabase PostgreSQL/Auth
                                      └── ECR / Secrets Manager / CloudWatch Logs qua NAT Gateway
```

VPC có hai public subnet ở hai Availability Zone để đặt ALB và hai NAT Gateway; có hai private subnet tương ứng cho ECS task. Private subnet A đi ra qua NAT-A, private subnet B qua NAT-B. ECS task không có public IP. ECR image pull, Secrets Manager, CloudWatch Logs, Supabase và các API bên ngoài đi qua NAT; S3 dùng Gateway Endpoint gắn vào hai private route table. NAT chỉ cho kết nối đi ra ngoài; Security Group của ECS chỉ nhận cổng 8080 từ Security Group của ALB. S3 bucket frontend không public; CloudFront đọc file qua Origin Access Control (OAC).

Trình duyệt gọi API cùng origin CloudFront. Trong code, các endpoint đã có đường dẫn `/api/v1/...`, vì vậy `VITE_API_BASE_URL` là `https://<CLOUDFRONT_DOMAIN>` — không thêm `/api`, `/api/v1`, dấu `/` cuối, ALB DNS hay localhost.

## 2. Điền bảng thông tin triển khai

### 2.1. Ghi lại thông tin triển khai

Tạo một bản ghi riêng trong ghi chú cá nhân. Không điền secret vào tài liệu này.

| Tên | Giá trị | Lấy chính xác ở đâu |
|---|---|---|
| AWS region | `ap-southeast-1` | Giá trị cố định; chọn Asia Pacific (Singapore) ở góc phải AWS Console |
| AWS account ID | 12 chữ số | PowerShell: `aws sts get-caller-identity`, lấy trường `Account` |
| Availability Zone A/B | Hai AZ trong Singapore | VPC → Subnets → Create subnet → menu Availability Zone; hoặc lệnh ở dưới. Dùng hai AZ khác nhau |
| CloudFront prefix list ID | Bắt đầu bằng `pl-` | Chạy lệnh ở dưới; chọn prefix-list-name `com.amazonaws.global.cloudfront.origin-facing` |
| Supabase project URL | `https://<project-ref>.supabase.co` | Supabase → Project Settings → API → Project URL |
| Supabase publishable key | Bắt đầu bằng `sb_publishable_` hoặc key công khai được Dashboard cấp | Supabase → Project Settings → API Keys → Publishable key. Chỉ dùng lúc build frontend |
| PostgreSQL connection string | Chuỗi Npgsql dạng `Host=...;Port=5432;...` | Supabase Dashboard → Connect → Session pooler. Copy host và username; thay password bằng database password mới |
| System actor profile ID | UUID | Supabase → SQL Editor, chạy truy vấn trong phần 7.3 và copy cột `id` đúng tài khoản |
| ECR repository URI | URI kết thúc bằng `/nexusoms-demo-api` | ECR → Private registry → Repositories → mở repository → Copy URI |
| Frontend bucket name | Tên bucket thực tế | S3 → Buckets; copy đúng tên bucket frontend đã tạo |
| ALB DNS name | DNS kết thúc bằng `.elb.amazonaws.com` | EC2 → Load Balancers → chọn ALB → Details → DNS name |
| CloudFront domain | Ví dụ `dxxxxxxxxxxxx.cloudfront.net` | CloudFront → Distributions → chọn distribution → General → Distribution domain name |
| CloudFront Distribution ID | Mã chữ/số của distribution | Cùng trang General, trường Distribution ID; không dùng domain thay ID |

### 2.2. Tạo IAM user tạm và kết nối PowerShell

Phần này dùng một IAM user tạm để AWS CLI trên máy Windows có quyền tạo tài nguyên cho workshop. Đây là cách đơn giản để dựng môi trường lần đầu, không phải cấu hình vận hành dài hạn. Không dùng root account cho lệnh hằng ngày. Sau khi hoàn tất demo và dọn tài nguyên, phải xóa Access Key và gỡ quyền `AdministratorAccess` theo bước cuối mục này.

#### A. Tạo IAM user tạm

1. Đăng nhập AWS Console bằng tài khoản đang có quyền quản trị.
2. Mở **IAM → Users → Create user**.
3. User name: `nexusoms-demo-deployer`.
4. Không bật quyền đăng nhập AWS Management Console cho user này; mục đích của user chỉ là AWS CLI.
5. Chọn **Next**. Ở **Permissions options**, chọn **Attach policies directly**.
6. Tìm và chọn policy AWS managed tên chính xác `AdministratorAccess`.
7. Chọn **Next → Create user**.

`AdministratorAccess` được dùng tạm vì workshop phải tạo nhiều loại tài nguyên như IAM, VPC, ECS, ECR, S3 và CloudFront. Cách này nhanh nhưng quyền rất rộng. Không dùng user này cho ứng dụng, không đưa Access Key vào code, GitHub, ảnh chụp hoặc tài liệu báo cáo.

#### B. Tạo Access Key cho AWS CLI

1. Mở user `nexusoms-demo-deployer` → tab **Security credentials**.
2. Trong **Access keys**, chọn **Create access key**.
3. Chọn use case **Command Line Interface CLI**.
4. Tick xác nhận đã hiểu khuyến nghị, chọn **Next**.
5. Description tag value: `nexusoms-demo-powershell`.
6. Chọn **Create access key**.
7. Tải file CSV hoặc copy riêng **Access key ID** và **Secret access key** vào trình quản lý mật khẩu. Secret chỉ hiển thị đầy đủ một lần.

Không chụp màn hình trang chứa Secret access key. Nếu key đã xuất hiện trong chat, ảnh, commit hoặc tài liệu, hãy vô hiệu hóa key đó và tạo key mới trước khi triển khai.

#### C. Tạo AWS CLI profile trên PowerShell

Mở PowerShell bằng user Windows bình thường rồi chạy:

```powershell
aws --version
aws configure --profile nexusoms-demo
```

AWS CLI hỏi bốn giá trị. Điền lần lượt:

| Câu hỏi của AWS CLI | Giá trị phải điền | Lấy ở đâu |
|---|---|---|
| `AWS Access Key ID` | Access key ID vừa tạo | IAM user → Security credentials → Access keys |
| `AWS Secret Access Key` | Secret access key vừa tạo | Màn hình Create access key hoặc file CSV vừa tải |
| `Default region name` | `ap-southeast-1` | Giá trị cố định của workshop |
| `Default output format` | `json` | Giá trị cố định |

Chọn profile cho cửa sổ PowerShell hiện tại và kiểm tra danh tính:

```powershell
$env:AWS_PROFILE = 'nexusoms-demo'
$env:AWS_REGION = 'ap-southeast-1'
aws configure list --profile nexusoms-demo
aws sts get-caller-identity --profile nexusoms-demo --region ap-southeast-1
```

**Kết quả cần thấy:** `Account` là đúng AWS account ID của bạn; trường `Arn` kết thúc bằng `user/nexusoms-demo-deployer`; region trong `aws configure list` là `ap-southeast-1`. Nếu báo `InvalidClientTokenId`, `SignatureDoesNotMatch` hoặc `Unable to locate credentials`, chạy lại `aws configure --profile nexusoms-demo` và nhập đúng cặp key còn Active.

Từ đây, các lệnh AWS CLI trong tài liệu dùng profile `nexusoms-demo`. Nếu mở PowerShell mới, chạy lại hai dòng `$env:AWS_PROFILE` và `$env:AWS_REGION`, hoặc thêm `--profile nexusoms-demo --region ap-southeast-1` vào lệnh.

#### D. Thu hồi quyền sau workshop

Chỉ thực hiện sau khi đã xóa toàn bộ tài nguyên AWS:

1. IAM → Users → `nexusoms-demo-deployer` → **Security credentials**.
2. Chọn Access Key đã tạo → **Actions → Deactivate**. Kiểm tra không còn dùng, sau đó **Delete**.
3. Tab **Permissions** → chọn `AdministratorAccess` → **Remove**.
4. Nếu user không còn mục đích khác, chọn **Delete user**.
5. Trên máy local, chạy `aws configure list-profiles`. Nếu không cần giữ profile, xóa riêng block `[nexusoms-demo]` trong `%USERPROFILE%\.aws\credentials` và `[profile nexusoms-demo]` trong `%USERPROFILE%\.aws\config`. Không xóa profile AWS khác.

### 2.3. Xác minh tài khoản AWS và lấy ID cần dùng

Chạy các lệnh này trong PowerShell để lấy những ID không cần đoán:

```powershell
$Region = 'ap-southeast-1'
aws sts get-caller-identity
aws ec2 describe-availability-zones --region $Region --query 'AvailabilityZones[].[ZoneName,State]' --output table
aws ec2 describe-managed-prefix-lists --region $Region --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing --query 'PrefixLists[0].[PrefixListId,PrefixListName]' --output table
```

**Kết quả cần thấy:** đúng AWS Account của bạn; các AZ đang `available`; prefix list có ID `pl-...` và tên `com.amazonaws.global.cloudfront.origin-facing`. Ghi lại prefix list ID để dùng làm nguồn inbound cho Security Group ALB.

Ảnh cần chụp: `02-prerequisites/aws-cli/aws-cli-and-validation.png`. Che email, account ID nếu yêu cầu báo cáo; tuyệt đối không chụp Access Key, secret hoặc token.

## 3. Chuẩn bị máy local và source code

### 3.1. Kiểm tra phần mềm

Mở Windows PowerShell. Chạy từng lệnh:

```powershell
git --version
node --version
npm --version
dotnet --version
docker version
aws --version
```

Docker phải hiện cả phần `Client` và `Server`. Nếu chỉ có Client hoặc báo không kết nối `dockerDesktopLinuxEngine`, mở Docker Desktop, chờ trạng thái Engine chạy rồi chạy lại `docker version`. Chưa có phần `Server` thì dừng, chưa build image.

### 3.2. Lấy nhánh mới nhất

```powershell
Set-Location E:\Noxus-aws\nexus-aws
git status --short
git switch main
git pull --ff-only origin main
git rev-parse --short HEAD
```

Nếu `git status --short` liệt kê thay đổi mà bạn chưa commit, dừng và xử lý chúng trước; không dùng `reset --hard`. Ghi lại commit hash vừa in ra để biết image build từ source nào.

### 3.3. Chạy kiểm tra trước khi đẩy

```powershell
Set-Location E:\Noxus-aws\nexus-aws\backend
dotnet test .\tests\NexusOMS.ApiTests\NexusOMS.ApiTests.csproj
docker build -t nexusoms-api:local-check .
```

Dockerfile backend hiện cài `libgssapi-krb5-2` trong image runtime. Thư viện này giúp Npgsql nạp GSSAPI/Kerberos trên Linux; nếu image đang deploy báo `Cannot load library libgssapi_krb5.so.2`, task đang chạy image cũ hoặc Dockerfile mới chưa được build/push/deploy. Sau này luôn dùng tag image mới, không ghi đè tag bất biến.

Chạy test frontend từ PowerShell khác:

```powershell
Set-Location E:\Noxus-aws\nexus-aws\frontend
npm ci
npm run typecheck
npm test
npm run build
```

Chỉ tiếp tục nếu các lệnh kết thúc thành công. Nếu lệnh trong `package.json` có tên khác trên nhánh mới, mở `frontend/package.json` và dùng script đã khai báo ở đó; không tự đoán.

### 3.4. Thông tin bí mật local

`backend` dùng .NET User Secrets cho chạy local. `frontend/.env.local` dùng biến Vite local và đã được `.gitignore` bỏ qua. Kiểm tra:

```powershell
git check-ignore -v .\frontend\.env.local
```

Kết quả phải chỉ ra quy tắc `.gitignore`. Không đưa `ConnectionStrings:Postgres`, webhook secret, Supabase service-role key hoặc JWT vào `.env` frontend, commit, issue GitHub hay ảnh chụp.

## 4. Region, chi phí và VPC

### 4.1. Chọn region và tạo cảnh báo chi phí

1. Mở AWS Console, nhìn bộ chọn region ở góc trên bên phải.
2. Chọn **Asia Pacific (Singapore) / ap-southeast-1** trước khi tạo resource.
3. Mở **Billing and Cost Management → Budgets → Create budget**.
4. Chọn **Cost budget**, kỳ **Monthly**, đặt mức tiền phù hợp với credit còn lại và nhập email nhận cảnh báo.
5. Thêm cảnh báo ở các ngưỡng 50%, 80% và 100%, rồi tạo budget.

Budget chỉ gửi cảnh báo, không tự dừng resource. Hai NAT Gateway, ALB, ECS chạy liên tục, CloudWatch log và truyền dữ liệu có thể tính tiền. Bản triển khai này không tạo bốn Interface Endpoint; S3 Gateway Endpoint không có phí theo giờ. Mở **Billing and Cost Management → Bills/Cost Explorer** để xem phát sinh thật; không lấy số ước tính cũ trong tài liệu làm giá hiện hành.

### 4.2. Tạo VPC

1. Mở **VPC → Your VPCs → Create VPC**.
2. Chọn **VPC only**.
3. Điền **Name tag** `nexusoms-demo-vpc`, **IPv4 CIDR** `10.80.0.0/16`, **IPv6 CIDR** `No IPv6 CIDR block`, **Tenancy** `Default`.
4. Chọn **Create VPC**.
5. Chọn VPC vừa tạo → **Actions → Edit VPC settings**.
6. Bật **Enable DNS resolution** và **Enable DNS hostnames**, lưu.

**Kiểm tra:** VPC có CIDR `10.80.0.0/16`; DNS resolution và DNS hostnames đều bật. Copy VPC ID vào bảng thông tin.

Ảnh cần chụp: `04-network/vpc/vpc-created.png`.

### 4.3. Tạo hai public và hai private subnet

Mở **VPC → Subnets → Create subnet**. Với từng subnet, chọn VPC `nexusoms-demo-vpc`, tên, Availability Zone và IPv4 CIDR trong bảng:

| Name | AZ | CIDR | Gán public IPv4 tự động |
|---|---|---|---|
| `nexusoms-demo-public-a` | AZ A | `10.80.0.0/24` | Bật |
| `nexusoms-demo-public-b` | AZ B | `10.80.1.0/24` | Bật |
| `nexusoms-demo-private-a` | Cùng AZ A | `10.80.10.0/24` | Tắt |
| `nexusoms-demo-private-b` | Cùng AZ B | `10.80.11.0/24` | Tắt |

Chọn AZ trong menu AWS Console; không tự gõ tên AZ chưa xác nhận. Tạo xong, chọn từng public subnet → **Actions → Edit subnet settings** → bật **Enable auto-assign public IPv4 address**. Private subnet để tắt.

Nếu Console có thuộc tính **Block public access** cho subnet, không cần bật thuộc tính đó để biến subnet thành private. ECS private được bảo vệ bằng cách không gán public IP, không có route trực tiếp tới IGW và dùng Security Group giới hạn inbound. Không gán public IP cho ECS task.

**Kiểm tra:** có đủ bốn subnet trong cùng VPC; hai subnet private không bật auto-assign public IPv4; mỗi AZ có một public và một private subnet.

## 5. Gắn Internet Gateway, route table và NAT Gateway

### 5.1. Internet Gateway và route cho public subnet

1. Vào **VPC → Internet gateways → Create internet gateway**.
2. Name: `nexusoms-demo-igw`; chọn **Create internet gateway**.
3. Chọn IGW → **Actions → Attach to a VPC** → chọn `nexusoms-demo-vpc` → **Attach**.
4. Mở **VPC → Route tables → Create route table**.
5. Name `nexusoms-demo-public-rt`, VPC `nexusoms-demo-vpc`; tạo.
6. Mở route table → **Routes → Edit routes → Add route**. Destination `0.0.0.0/0`; Target chọn **Internet Gateway** rồi chọn `nexusoms-demo-igw`; lưu.
7. Mở **Subnet associations → Edit subnet associations**; chọn cả `public-a` và `public-b`; lưu.

**Kiểm tra:** tab Routes có local route của VPC và `0.0.0.0/0 → igw-...`; tab Subnet associations có đúng hai public subnet.

### 5.2. Tạo hai Elastic IP và hai NAT Gateway

1. Vào **VPC → Elastic IPs → Allocate Elastic IP address**.
2. Chọn **Allocate** hai lần. Đặt Name tag khác nhau: `nexusoms-demo-nat-eip-a` và `nexusoms-demo-nat-eip-b`.
3. Mở **VPC → NAT gateways → Create NAT gateway**.
4. NAT A: Name `nexusoms-demo-nat-a`; Subnet `nexusoms-demo-public-a`; Connectivity type **Public**; chọn Elastic IP A; tạo.
5. NAT B: Name `nexusoms-demo-nat-b`; Subnet `nexusoms-demo-public-b`; Connectivity type **Public**; chọn Elastic IP B; tạo.
6. Chờ cả hai NAT Gateway có trạng thái **Available** trước khi tạo route private.

### 5.3. Route riêng cho private subnet

1. Tạo route table `nexusoms-demo-private-a-rt` trong VPC `nexusoms-demo-vpc`.
2. Thêm route Destination `0.0.0.0/0`, Target **NAT Gateway** `nexusoms-demo-nat-a`; associate chỉ với `nexusoms-demo-private-a`.
3. Tạo route table `nexusoms-demo-private-b-rt`.
4. Thêm route Destination `0.0.0.0/0`, Target NAT `nexusoms-demo-nat-b`; associate chỉ với `nexusoms-demo-private-b`.

Không nhập IP Supabase vào route table. Route NAT cho phép task trong private subnet khởi tạo kết nối đi ra Internet; nó không mở kết nối từ Internet đi thẳng vào ECS.

**Kiểm tra:** private route A đi NAT A; private route B đi NAT B; không route private nào trỏ thẳng tới IGW.

Ảnh cần chụp: `04-network/subnets-routes/private-route-tables.png`.

## 6. Security Groups và S3 Gateway Endpoint

### 6.1. Tạo hai Security Group

Mở **VPC → Security Groups → Create security group**. Mỗi SG phải ở VPC `nexusoms-demo-vpc`.

| Security Group | Inbound rule | Source phải chọn | Dùng cho |
|---|---|---|---|
| `nexusoms-demo-alb-sg` | HTTP TCP 80 | Prefix list ID `pl-...` ở phần 2 | ALB chỉ nhận request đến từ mạng CloudFront |
| `nexusoms-demo-task-sg` | Custom TCP 8080 | Security Group `nexusoms-demo-alb-sg` | ECS chỉ nhận request từ ALB |

Trong ô Source của ALB SG, chọn **Prefix lists** rồi tìm/chọn prefix list `com.amazonaws.global.cloudfront.origin-facing` theo ID đã tra. Không chọn **Anywhere-IPv4 / 0.0.0.0/0**. Outbound có thể giữ mặc định cho demo. Không thêm inbound public cho ECS task.

### 6.2. Tạo một S3 Gateway Endpoint

Vào **VPC → Endpoints → Create endpoint**. Chỉ tạo **một S3 Gateway Endpoint**; không tạo Interface Endpoint cho `ecr.api`, `ecr.dkr`, `logs` hoặc `secretsmanager`.

- Service category: AWS services; tìm `com.amazonaws.ap-southeast-1.s3`.
- VPC: `nexusoms-demo-vpc`.
- Endpoint type: Gateway.
- Route tables: chọn cả `nexusoms-demo-private-a-rt` và `nexusoms-demo-private-b-rt`.
- Security Group: không có; Gateway Endpoint không dùng SG.
- Policy: Full access cho demo; chọn **Create endpoint**.

ECS task trong private subnet truy cập ECR để tải image, Secrets Manager để lấy cấu hình và CloudWatch Logs để ghi log qua NAT Gateway cùng AZ. Vì vậy cần xác nhận private-a route tới NAT-A và private-b route tới NAT-B; NAT phải ở trạng thái **Available**, có EIP, và public route table của NAT có route `0.0.0.0/0` tới IGW. Không tạo endpoint security group.

**Không tạo** Interface Endpoint cho `com.amazonaws.ap-southeast-1.ecr.api`, `ecr.dkr`, `logs` hoặc `secretsmanager`. Cách này giảm phí cố định của bốn endpoint, đổi lại lưu lượng dịch vụ AWS đi qua NAT và có thể phát sinh phí xử lý dữ liệu NAT.

Ảnh cần chụp: `04-network/vpc-endpoints/endpoints-created.png` thể hiện một S3 Gateway Endpoint trạng thái **Available** và hai NAT Gateway trạng thái **Available**; không cần chụp Interface Endpoint.

## 7. Secrets Manager, IAM và CloudWatch Logs

### 7.1. Tạo secret JSON

Mở Supabase Dashboard đúng project:

- **Project URL:** Project Settings → API → Project URL.
- **Database connection:** chọn **Connect → Session pooler**. Copy host, port và username Dashboard trả về; không tự ghép pooler host bằng region/project ref.
- **Database password:** dùng password mới đã đặt trong Supabase. Nếu password có ký tự đặc biệt, dùng chuỗi kết nối do Supabase cấp hoặc percent-encode theo hướng dẫn Supabase trước khi đưa vào URI; nếu nhập theo Npgsql key-value format, đặt password đúng dạng Npgsql và không làm lộ trong log.
- **Profile UUID:** làm theo truy vấn phần 7.3.

Sau đó AWS Console → **Secrets Manager → Store a new secret → Other type of secret**. Chọn nhập **Plaintext** JSON. Thay toàn bộ placeholder bằng giá trị thật, không giữ từ `PENDING`:

```json
{
  "postgresConnectionString": "Host=<SESSION_POOLER_HOST>;Port=5432;Database=postgres;Username=<POOLER_USERNAME>;Password=<NEW_DATABASE_PASSWORD>;SSL Mode=Require;Trust Server Certificate=true",
  "supabaseUrl": "https://<PROJECT_REF>.supabase.co",
  "systemActorId": "<PROFILE_UUID>",
  "webhookSigningSecret": "<RANDOM_SECRET_AT_LEAST_32_CHARACTERS>"
}
```

Tên Secret: `nexusoms/demo/application`. Chọn Next, Next, Store. Secret có bốn JSON key trên; không tạo bốn secret riêng. Sau khi lưu, vào secret details và copy **Secret ARN** đầy đủ để gán quyền cho execution role.

### 7.2. Lấy `systemActorId` đúng tài khoản

Trong Supabase Dashboard → **SQL Editor → New query**, chạy câu sau, thay email bằng email đăng nhập của user dùng để demo:

```sql
select id, email
from public.profiles
where lower(email) = lower('<EMAIL_DANG_NHAP>')
limit 1;
```

Copy `id` dạng UUID của đúng dòng. Nếu không có kết quả, kiểm tra user đã có profile trong `public.profiles` chưa; không tự tạo UUID ngẫu nhiên. Giá trị này phải là profile hợp lệ, nếu không webhook simulator trả lỗi `SystemActorId phải là UUID profile hợp lệ`.

### 7.3. Tạo IAM execution role và task role

Mở **IAM → Roles → Create role**.

**Execution role**

1. Trusted entity: **AWS service** → **Elastic Container Service** → **Elastic Container Service Task**.
2. Gắn policy AWS-managed `AmazonECSTaskExecutionRolePolicy`.
3. Tên role: `nexusoms-demo-ecs-execution-role`; tạo role.
4. Mở role → **Add permissions → Create inline policy → JSON** và dán policy sau. Thay `<SECRET_ARN>` bằng ARN đầy đủ đã copy, gồm hậu tố ngẫu nhiên sau tên secret.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadNexusOmsApplicationSecret",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "<SECRET_ARN>"
    }
  ]
}
```

5. Next → Policy name `ReadNexusOmsApplicationSecret` → Create policy.

**Task role**

1. Tạo role mới với cùng trusted entity **Elastic Container Service Task**.
2. Không gắn `AdministratorAccess`; code hiện tại không cần quyền gọi AWS API trực tiếp.
3. Role name `nexusoms-demo-ecs-task-role`; tạo role.

Execution role là quyền ECS dùng để tải image, ghi log và lấy secret khi task khởi động. Task role là quyền cấp cho ứng dụng .NET đang chạy trong container. Không tráo hai role.

### 7.4. Tạo CloudWatch Log Group

Mở **CloudWatch → Logs → Log groups → Create log group**. Nhập `/ecs/nexusoms-demo-api`, retention `14 days`; tạo. Task definition sẽ ghi log vào đây.

Ảnh cần chụp: `05-secrets-manager/application-secret/key-names.png` chỉ để lộ tên key, che toàn bộ value. Chụp role và policy ở `05-secrets-manager/iam/secret-read-policy.png`, không để lộ credentials.

## 8. Tạo ECR repository và đẩy backend image

### 8.1. Tạo ECR repository theo giao diện hiện tại

1. Chọn region `ap-southeast-1`.
2. Mở **Amazon ECR → Private registry → Repositories → Create repository**.
3. Visibility: **Private**. Repository name: `nexusoms-demo-api`.
4. Image tag mutability: **Immutable**.
5. Encryption: giữ AES-256 mặc định.
6. Phần **Image scanning settings - deprecated** có thể chỉ còn toggle **Scan on push**. Đây là cấu hình cũ đã được chuyển lên registry-level; không cần tìm menu `Basic scanning`. Để tạo repository có thể giữ toggle theo lựa chọn demo của bạn; việc scanning không quyết định task có pull image được hay không. Nếu cần bật scan, bật Scan on push hoặc cấu hình trong **ECR → Private registry → Features & settings** sau này.
7. Tạo repository. Mở repository và dùng **Copy URI**. URI phải kết thúc bằng `/nexusoms-demo-api`; lưu lại nguyên văn.

Đừng tự gõ account ID trong URI nếu có thể copy từ Console. Không dùng `latest`: repository immutable từ chối ghi đè tag đã tồn tại.

Ảnh cần chụp: `06-ecr/image-push/repository-created.png` và `06-ecr/image-push/image-pushed.png`.

### 8.2. Đăng nhập Docker vào ECR và push tag duy nhất

Chạy trong PowerShell từ repository root. Thay `<ECR_REPOSITORY_URI>` bằng URI đã copy. Mỗi lần build phải dùng tag chưa từng dùng trong repository immutable, ví dụ ngày build và số thứ tự mới.

```powershell
$Region = 'ap-southeast-1'
$EcrRepositoryUri = '<ECR_REPOSITORY_URI>'
$Registry = $EcrRepositoryUri.Split('/')[0]
$ImageTag = 'vYYYY-MM-DD-01'

aws ecr get-login-password --region $Region |
  docker login --username AWS --password-stdin $Registry

Set-Location E:\Noxus-aws\nexus-aws
docker build -f .\backend\Dockerfile -t "nexusoms-demo-api:$ImageTag" .\backend
docker tag "nexusoms-demo-api:$ImageTag" "$EcrRepositoryUri`:$ImageTag"
docker push "$EcrRepositoryUri`:$ImageTag"
```

Kết quả login phải là `Login Succeeded`. Sau khi push, ECR → repository → Images phải có tag vừa tạo và digest. Ghi lại **full image URI**, gồm tag. Khi lỗi Docker API, kiểm tra Docker Desktop có chạy Linux Engine; khi ECR `no basic auth credentials`, chạy lại lệnh login đúng region/account.

## 9. Tạo ECS cluster, task definition và service

### 9.1. Cluster

1. Mở **Amazon ECS → Clusters → Create cluster**.
2. Cluster name: `nexusoms-demo-cluster`.
3. Chọn infrastructure phù hợp Fargate; không cần EC2 capacity provider cho cấu hình này.
4. Tạo cluster.
5. Mở cluster → **Configuration**. Xác nhận **Container Insights** đang bật. Nếu chưa, dùng **Update cluster** hoặc **Actions** để bật; Console mới có thể không gọi mục này là “Cluster settings”.

### 9.2. Target group và Application Load Balancer

Tạo Target Group trước:

1. Mở **EC2 → Target Groups → Create target group**.
2. Target type: **IP addresses**; protocol **HTTP**, port `8080`.
3. VPC `nexusoms-demo-vpc`; Target group name `nexusoms-demo-api-tg`.
4. Health check protocol HTTP, path `/health`, success code `200`; tạo target group. Không đăng ký IP thủ công — ECS tự đăng ký task IP.

Tạo ALB:

1. EC2 → **Load Balancers → Create load balancer → Application Load Balancer**.
2. Name `nexusoms-demo-alb`; Scheme **Internet-facing**; IP address type IPv4.
3. Chọn VPC `nexusoms-demo-vpc`, mapping cả hai public subnet ở hai AZ.
4. Security Group chỉ chọn `nexusoms-demo-alb-sg`.
5. Listener HTTP:80, default action forward tới `nexusoms-demo-api-tg`; tạo ALB.
6. Chờ ALB `Active`; copy DNS name trong Details.

Trong demo này, CloudFront → ALB dùng HTTP:80 để không cần domain/certificate riêng. Người dùng vẫn truy cập CloudFront bằng HTTPS. Khi có domain API riêng và ACM certificate đúng region, mới chuyển origin sang HTTPS.

### 9.3. Tạo task definition

Mở **Amazon ECS → Task definitions → Create new task definition**. Trên giao diện mới, phần biến môi trường nằm trong container definition; không tìm “Add environment variable from Secrets Manager” ở tab khác.

1. Family: `nexusoms-demo-api`.
2. Launch type/infrastructure: AWS Fargate; OS Linux; architecture X86_64.
3. CPU `0.5 vCPU` (`512`); Memory `1 GB` (`1024 MiB`).
4. Task role: `nexusoms-demo-ecs-task-role`.
5. Task execution role: `nexusoms-demo-ecs-execution-role`.
6. Container name `api`; Image URI dán full ECR URI gồm tag mới.
7. Port mapping: container port `8080`, protocol TCP.
8. Environment variables → Add individually: Key `ASPNETCORE_ENVIRONMENT`, Value `Production`.
9. Environment variables → Add individually → chọn **Value type: ValueFrom**. Với mỗi dòng, Key là tên biến môi trường; ValueFrom chọn Secret `nexusoms/demo/application` và đúng JSON key:

| Key trong task definition | JSON key cần chọn trong secret |
|---|---|
| `ConnectionStrings__Postgres` | `postgresConnectionString` |
| `Supabase__Url` | `supabaseUrl` |
| `WebhookSimulator__Secret` | `webhookSigningSecret` |
| `WebhookSimulator__SystemActorId` | `systemActorId` |

Mỗi dòng đều có **Value type = ValueFrom**, nhưng phải chọn đúng JSON key riêng của dòng đó. Không nhập cùng `nexusoms/demo/application` làm giá trị plain text; không trỏ cả bốn biến vào cùng một JSON object. Tên bên trái phải khớp chính xác, gồm hai dấu gạch dưới `__`.

10. Logging: driver `awslogs`, log group `/ecs/nexusoms-demo-api`, region `ap-southeast-1`, stream prefix `ecs`.
11. Tạo task definition và ghi revision mới, ví dụ `nexusoms-demo-api:1`.

Nếu AWS báo execution role không thể đọc secret, mở đúng execution role và xác nhận policy `ReadNexusOmsApplicationSecret` có ARN trùng Secret ARN. Nếu vừa sửa secret, ECS không tự thay env trong task đang chạy; cần deploy task mới.

### 9.4. Tạo ECS service

1. Cluster `nexusoms-demo-cluster` → **Services → Create**.
2. Compute: Fargate; chọn task definition family/revision vừa tạo.
3. Service name: `nexusoms-demo-api-service` (nếu tên này đã dùng, giữ tên service hiện có, không tạo service thứ hai).
4. Desired tasks: dùng `1` để giảm chi phí khi thử; tăng lên `2` khi cần trình diễn task ở cả hai AZ. Desired `1` có nghĩa service chưa bảo đảm task luôn nằm ở cả hai AZ.
5. Networking: VPC `nexusoms-demo-vpc`, Subnets chọn cả private-a và private-b; SG `nexusoms-demo-task-sg`; **Auto-assign public IP = DISABLED**.
6. Load balancing: Application Load Balancer; chọn `nexusoms-demo-alb`, listener HTTP:80, target group `nexusoms-demo-api-tg`; container `api`, port `8080`.
7. Tạo service, chờ deployment ổn định.

**Kiểm tra trước khi tiếp tục:** ECS Service có Running tasks bằng Desired count; Target Group → Targets có IP của task và trạng thái **Healthy**; CloudWatch log group có stream mới với `Application started` và `Now listening on: http://[::]:8080` hoặc địa chỉ cổng 8080. Task không có public IP.

Không test `/health` bằng `https://<CLOUDFRONT_DOMAIN>/health`: default CloudFront behavior trỏ S3 nên path này không phải API health route. ALB SG cũng chặn truy cập laptop trực tiếp theo thiết kế; dùng Target Group health, ECS events và CloudWatch logs để kiểm tra.

Ảnh cần chụp: `07-ecs/cluster-service/service-running.png` và `07-ecs/health/target-group-health.png`.

## 10. Tạo S3 bucket và CloudFront distribution

### 10.1. S3 frontend bucket riêng tư

1. Mở **S3 → Buckets → Create bucket**.
2. Bucket name phải duy nhất toàn cầu, ví dụ `nexusoms-demo-frontend-<AWS_ACCOUNT_ID>`; thay placeholder bằng account ID của bạn.
3. Region `ap-southeast-1`.
4. Giữ **Block all public access** bật. Không tắt để “test cho nhanh”.
5. Bật versioning nếu muốn lưu bản cũ; encryption SSE-S3 mặc định; tạo bucket.
6. Không bật Static website hosting. CloudFront dùng S3 REST origin riêng tư qua OAC.

### 10.2. Tạo distribution với S3 làm origin mặc định

1. Mở **CloudFront → Distributions → Create distribution**.
2. Distribution name: `nexusoms-demo-web`; chọn **Single website configuration**.
3. Domain managed by Route 53: để trống/skip. Ta dùng domain `cloudfront.net`; không cần mua domain hoặc Route 53.
4. Ở **Specify origin**, chọn **Amazon S3** và bucket vừa tạo.
5. Bật **Allow private S3 bucket access to CloudFront** / tạo OAC được khuyến nghị. Chấp nhận để Console cập nhật bucket policy nếu được hỏi.
6. Origin settings và cache settings giữ đề xuất cho file tĩnh.
7. Viewer protocol policy chọn Redirect HTTP to HTTPS; default root object `index.html` nếu trường này có trong bước đầu hoặc bổ sung trong General sau khi tạo.
8. WAF: với demo tiết kiệm, chọn **Do not enable security protections**. WAF có thể phát sinh phí; không bật nhầm protection khi chưa kiểm tra ước tính.
9. Tạo distribution. Chờ status **Deployed**.

S3 origin sẽ có dạng bucket regional domain hoặc tên origin do CloudFront tạo. OAC phải được gắn với S3 origin. S3 vẫn giữ Block Public Access bật.

### 10.3. Thêm ALB làm origin thứ hai

Đây là bước phải làm **trước khi tạo `/api/*` behavior**. Behavior chỉ liệt kê những origin đã tồn tại. Nếu dropdown origin chỉ hiện S3, ALB origin chưa được tạo — không cố chọn S3 cho API.

1. Mở distribution → tab **Origins** → **Create origin**.
2. Chọn origin type **Elastic Load Balancer** nếu Console cho chọn loại này; nếu Console yêu cầu domain, paste ALB DNS đã copy, ví dụ dạng `nexusoms-demo-alb-....ap-southeast-1.elb.amazonaws.com`.
3. Không gõ `https://` và không thêm path vào domain origin.
4. Origin protocol: **HTTP only**, HTTP port `80` cho cấu hình demo hiện tại.
5. Origin name `nexusoms-demo-alb-origin`; lưu origin.
6. Xác nhận tab Origins có hai origin: S3 frontend và ALB.

### 10.4. Tạo `/api/*` behavior nối đến ALB

1. Distribution → **Behaviors → Create behavior**.
2. Path pattern: `/api/*`.
3. Origin: chọn `nexusoms-demo-alb-origin` (không chọn S3).
4. Viewer protocol policy: **Redirect HTTP to HTTPS**.
5. Allowed HTTP methods: `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`.
6. Cache policy: **CachingDisabled**.
7. Origin request policy: **AllViewerExceptHostHeader** để chuyển tiếp Authorization header/JWT và query/request headers cần thiết, không chuyển Host của browser thành Host origin.
8. Tạo behavior. Behavior `/api/*` phải đứng trước behavior `Default (*)`; CloudFront tự áp dụng path match cụ thể.

**Kiểm tra:** trong Behaviors có `Path pattern /api/* → ALB origin`, cache disabled. Nếu dropdown không có ALB, quay lại Origins và hoàn thành mục 10.3. Không tạo behavior API trỏ S3.

### 10.5. SPA deep link bằng CloudFront Function

React/Vite chỉ có `index.html`. Khi mở thẳng `/app?page=dashboard`, S3 tìm object tên `/app` và có thể trả XML `AccessDenied`. CloudFront Function ở **Viewer request của Default (*) behavior** đổi URI frontend không có đuôi file thành `/index.html`. Query `?page=dashboard` được giữ nguyên.

1. CloudFront → **Functions → Create function**.
2. Function name: `nexusoms-demo-spa-routing`; runtime JavaScript 2.0 nếu Console hỏi.
3. Thay code mẫu bằng đoạn sau:

```javascript
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // Route SPA như /app hoặc /app?page=dashboard về tài liệu React.
    // File tĩnh như /assets/index-abc.js vẫn giữ nguyên URI.
    if (uri === "/" || uri.indexOf(".") === -1) {
        request.uri = "/index.html";
    }

    return request;
}
```

4. Chọn **Save changes**, sau đó **Publish function**. Chọn stage **LIVE** khi gắn vào distribution.
5. Distribution → **Behaviors** → chọn `Default (*)` → **Edit**.
6. Phần **Function associations** → Viewer request → CloudFront Functions → chọn `nexusoms-demo-spa-routing`, stage **LIVE**; lưu.
7. Không gắn function này lên `/api/*` behavior. Không đổi ALB/API origin.
8. Chờ distribution status **Deployed**, rồi tạo invalidation `/*` ở mục Invalidations.

Không cấu hình custom error 403/404 thành trang `/index.html` trả HTTP 200 khi đã dùng Function. Custom error áp dụng cho lỗi thật từ origin và có thể biến lỗi API/S3 thành HTML 200, khiến trình duyệt báo lỗi khó hiểu. Function xử lý đường dẫn SPA trước khi S3 tìm object, còn lỗi quyền thật vẫn phải hiện ra để xử lý đúng.

Ảnh cần chụp: `09-cloudfront/distribution/distribution-config.png` thể hiện hai origin, `/api/*` trỏ ALB, `Default (*)` trỏ S3 và Function LIVE ở Viewer request. `09-cloudfront/spa-routing/function-live.png` thể hiện function Published/LIVE; không chụp secret.

### 10.6. Ghi lại CloudFront domain và ID

Distribution → General. Copy riêng:

- **Distribution domain name**, ví dụ `dxxxxxxxxxxxx.cloudfront.net`; dùng trong website URL và frontend API base URL.
- **Distribution ID**, mã khác domain; dùng khi tạo invalidation.

Không dùng ALB DNS làm website URL, không dùng S3 URL làm website URL, không dùng Distribution ID làm URL.

## 11. Build và upload frontend đúng endpoint

Frontend API client nối `VITE_API_BASE_URL` trực tiếp với các path đã có `/api/v1/...`. Vì vậy biến phải là domain CloudFront gốc, không có `/api`:

```text
Đúng:  VITE_API_BASE_URL=https://dxxxxxxxxxxxx.cloudfront.net
Sai:   VITE_API_BASE_URL=/api
Sai:   VITE_API_BASE_URL=https://dxxxxxxxxxxxx.cloudfront.net/api
Sai:   VITE_API_BASE_URL=http://localhost:5145
```

Đặt ba biến dưới đây trong PowerShell, thay domain, URL và publishable key bằng giá trị thật:

```powershell
Set-Location E:\Noxus-aws\nexus-aws\frontend
$env:VITE_DATA_MODE = 'supabase'
$env:VITE_API_BASE_URL = 'https://<CLOUDFRONT_DOMAIN>'
$env:VITE_SUPABASE_URL = 'https://<PROJECT_REF>.supabase.co'
$env:VITE_SUPABASE_ANON_KEY = '<SUPABASE_PUBLISHABLE_KEY>'
npm ci
npm run build
```

Vite nhúng `VITE_*` vào JavaScript lúc build; thay Environment Variables trong hosting sau đó không sửa được file đã build. Nếu đổi API base URL hoặc Supabase URL/key, build và upload lại frontend.

Sau build, từ thư mục `frontend` chạy:

```powershell
$BucketName = '<FRONTEND_BUCKET_NAME>'
$DistributionId = '<CLOUDFRONT_DISTRIBUTION_ID>'
aws s3 sync .\dist\ "s3://$BucketName/" --delete --region ap-southeast-1
aws cloudfront create-invalidation --distribution-id $DistributionId --paths '/*' --region us-east-1
```

`aws cloudfront` là global service; nếu CLI báo region, dùng `us-east-1` hoặc bỏ `--region`. `--delete` chỉ dùng khi bucket dành riêng cho frontend này vì nó xóa object cũ không còn trong `dist`. Kiểm tra S3 có `index.html` và `assets/`; CloudFront → Invalidations phải hoàn tất trước khi test.

Ảnh cần chụp: `08-s3/frontend-assets/frontend-assets.png` (index.html và assets), `09-cloudfront/invalidation/invalidation-complete.png` (status Completed).

## 12. Supabase Auth và kiểm tra đăng nhập

1. Supabase Dashboard → **Authentication → URL Configuration**.
2. **Site URL** nhập `https://<CLOUDFRONT_DOMAIN>` — chỉ domain gốc, không `/app` hoặc `?page=...`.
3. **Redirect URLs** thêm `https://<CLOUDFRONT_DOMAIN>/*`. Giữ localhost redirect nếu vẫn phát triển local.
4. Save.
5. Mở tab ẩn danh `https://<CLOUDFRONT_DOMAIN>/app`. Đăng nhập bằng user Supabase đã có dòng hợp lệ trong `public.profiles` và role phù hợp.
6. Mở DevTools → Network → request `GET /api/v1/session/me`.

**Đăng nhập thành công khi:** request URL là `https://<CLOUDFRONT_DOMAIN>/api/v1/session/me` — chỉ một đoạn `/api`; Request Headers có `Authorization: Bearer ...`; response HTTP 200 trả `userId` và `roles`.

Không gửi Bearer token cho người khác và không dán token vào tài liệu/chụp ảnh. Nếu token từng bị chia sẻ, đăng xuất các session có thể và đăng nhập lại.

## 13. Kiểm thử end-to-end trong ứng dụng

Thực hiện bằng user có role `admin` hoặc `manager` và data demo phù hợp.

Lưu các ảnh vào thư mục dịch vụ tương ứng dưới `fcj-workshop-thanh-binh/content/5-Workshop/`. Các tên file bên dưới giữ nguyên để ghép với cấu trúc workshop đã tạo.

1. **Sản phẩm:** xác nhận có sản phẩm active, SKU nội bộ đúng, giá vốn đã có.
2. **Kho:** mở Vận hành kho; chọn đúng warehouse; xác nhận sản phẩm có tồn khả dụng đủ cho quantity trong payload. `Tồn khả dụng = tồn thực tế - đang giữ - không khả dụng` theo dữ liệu hiện tại.
3. **Kết nối sàn:** chọn/tạo channel connection đúng Shopee/TikTok Shop/Lazada; ghi lại tên tài khoản.
4. **Ánh xạ SKU:** với channel connection đã chọn, tạo mapping từ SKU trên kênh đúng sang SKU nội bộ đúng. SKU payload phải khớp mapping; nhập SKU ngẫu nhiên thì mapping thất bại.
5. **Mô phỏng webhook:** mở nút tròn ở góc dưới bên phải → Mô phỏng Flash Sale; chọn đúng tài khoản kênh và kho xuất; chọn SKU đã ánh xạ; nhập quantity dương và đơn giá; thêm vào payload.
6. Bấm **Bắt đầu: Tạo đơn**. Quan sát process; chỉ bấm bước tiếp theo sau khi bước hiện tại báo thành công: **Tạo đơn & giữ tồn → Xác nhận đơn → Chuẩn bị hàng → Xuất kho & vận chuyển → Giao thành công**.
7. Sau từng bước, mở Đơn hàng và Vận hành kho để đối chiếu order status và số tồn. Sau bước cuối mở Hiệu quả kênh và Lợi nhuận đơn để kiểm tra số liệu.
8. Trong CloudWatch → Log groups → `/ecs/nexusoms-demo-api`, mở stream có timestamp vừa test; xác nhận không có unhandled exception.

Không gửi lại cùng một event/key để “thử thêm” nếu đơn đã xử lý; backend dùng idempotency và có thể trả kết quả replay/conflict. Tạo kịch bản đơn mới bằng simulator. Không chạy số lượng vượt tồn khả dụng.

Ảnh cần chụp: `10-verification/browser-login/live-homepage.png`, `10-verification/webhook-flow/webhook-flow.png`, `10-verification/cloudwatch-logs/api-logs.png`. Che email, JWT, database strings và mọi secret.

## 14. Chẩn đoán lỗi theo bằng chứng

| Triệu chứng | Ý nghĩa thường gặp | Kiểm tra và xử lý theo thứ tự |
|---|---|---|
| XML `AccessDenied` khi mở `/app?page=dashboard` nhưng `/app` mở được | S3 nhận URI `/app` thay vì `/index.html`, hoặc Function chưa LIVE/gắn đúng | Function Published? Stage LIVE? Distribution → Default `(*)` → Viewer request có Function? Distribution Deployed? Sau đó invalidation `/*`; query string phải được giữ. Không sửa API behavior để xử lý lỗi này |
| URL là `/api/api/v1/session/me` hoặc `/api/api/v1/returns` | API base URL đã bị thêm `/api`, trong khi code endpoint có sẵn `/api/v1` | Build frontend lại với `VITE_API_BASE_URL=https://<CLOUDFRONT_DOMAIN>` không có path; upload `dist`; invalidation `/*` |
| `/api/v1/session/me` 401 | API không chấp nhận bearer token hoặc token không được gửi | DevTools Network kiểm tra Authorization có hay không; login mới; kiểm tra Supabase URL/JWKS và clock/token. Không paste JWT vào chat/log |
| `/api/v1/session/me` 403 sau khi Supabase password login thành công | Backend đã nhận diện user nhưng profile/role/quyền không hợp lệ, hoặc request nhầm API | Xem response body; kiểm tra `public.profiles` có đúng user ID/role; xác nhận request đi qua `/api/*` tới ALB, không tới S3 |
| API trả 500 với `ArgumentNullException (Host)` | `ConnectionStrings__Postgres` rỗng/không được inject | Task Definition → revision đang chạy → Secrets: kiểm tra Key chính xác, ValueFrom chọn JSON key `postgresConnectionString`, execution role đọc đúng ARN; update service để tạo task mới |
| Log `Cannot load library libgssapi_krb5.so.2` | Image runtime không có package Linux cần cho Npgsql, hoặc service vẫn chạy image cũ | Kiểm tra Dockerfile cài `libgssapi-krb5-2`; build/push tag immutable mới; tạo task definition revision trỏ full URI mới; update service và chờ deployment ổn định |
| `NpgsqlException` DNS/Host không resolve tới `db.<ref>.supabase.co` | VPC egress IPv4 không truy cập direct endpoint IPv6 hoặc host bị nhập sai | Supabase → Connect → **Session pooler**; copy host/username hiện tại, port 5432; cập nhật `postgresConnectionString`; tạo task mới. Không đoán pooler host bằng cách ghép chuỗi |
| `GET /api/v1/returns` trả 405 với `Server: Kestrel` và `Allow: POST` | Request đã tới backend; đang chạy revision/image có action chỉ POST hoặc code đang deploy khác source hiện tại | So revision ECS đang active và image URI/tag; so source `ReturnsController` trên commit cần deploy; build tag mới, task definition revision mới, update service. Không sửa API behavior CloudFront nếu method đã được phép |
| CloudFront API trả 403/404/405/502/504 | Behavior trỏ origin sai, method không được phép, hoặc API/ALB health | `/api/*` phải trỏ ALB; kiểm tra allowed methods; 405 + `Server: Kestrel` là backend route/method; 502/504 kiểm tra Target Group Healthy và ECS logs. Không tạo SPA fallback cho API |
| Dropdown origin khi tạo behavior chỉ có S3 | ALB chưa được thêm vào Origins | Distribution → Origins → Create origin, nhập/chọn ALB DNS, lưu; quay lại Behaviors và tạo `/api/*` |
| Website vẫn là build cũ sau khi upload | Edge/browser đang giữ bản cũ hoặc build từ sai branch/biến | Xác nhận `git rev-parse HEAD`, xem S3 `index.html`/assets, tạo invalidation `/*`, mở tab ẩn danh/clear cache |
| Webhook báo `SystemActorId phải là UUID profile hợp lệ` | Secret actor ID không khớp `public.profiles.id` | Chạy truy vấn SQL phần 7.2, cập nhật JSON `systemActorId`, update service/force new deployment |
| Webhook 409 | Backend từ chối trạng thái/dữ liệu trùng hoặc nghiệp vụ không hợp lệ; không đồng nghĩa request không tới API | Đọc response body trong Network; xác nhận mapping đúng, còn tồn khả dụng, event/order chưa bị xử lý và đang bấm đúng bước kế tiếp. Tạo scenario mới thay vì replay event cũ |
| Browser báo CORS khi frontend và API đang cùng CloudFront | Frontend có thể build nhầm ALB/Render URL, khiến request thành cross-origin | `VITE_API_BASE_URL` phải đúng CloudFront origin gốc; behavior `/api/*` nối ALB. CORS không thay thế cấu hình origin và token forwarding |
| `GET /health` ở CloudFront trả S3 XML | `/health` không thuộc API behavior `/api/*` | Đây không phải test endpoint qua CloudFront. Dùng Target Group health `/health`, ECS task health và CloudWatch logs |

Khi gửi lỗi để nhờ kiểm tra, chỉ gửi: request URL đã che token, HTTP status, response body đã che dữ liệu cá nhân và dòng log quanh thời điểm lỗi. Không gửi `Authorization`, cookie, connection string hoặc secret value.

## 15. Cập nhật backend mà không làm lệch ECS

Mỗi lần thay backend:

1. Kéo đúng source đã review, chạy tests.
2. Build Docker image với tag mới chưa dùng.
3. Push image tag mới lên ECR.
4. ECS → Task definitions → tạo revision mới; sửa **Image URI** sang full ECR URI + tag mới. Giữ nguyên roles, port 8080, logging và bốn secret mapping.
5. ECS → Cluster → Service → Update service; chọn task definition revision mới, cập nhật.
6. Chờ task mới `Running`, service ổn định và Target Group `Healthy`. Kiểm tra CloudWatch log trước khi kết luận deploy xong.

Khi cập nhật Secret Manager, task đang chạy vẫn giữ giá trị lúc khởi động. Tạo deployment mới hoặc chọn **Force new deployment** sau khi lưu secret. Không sửa task bằng cách đổi mutable tag vì ECR repository đang immutable.

Frontend cập nhật riêng: build lại đúng biến Vite → `aws s3 sync` → CloudFront invalidation. Thay environment variable trên AWS không sửa JS đã build.

## 16. Chụp bằng chứng workshop

Chụp ngay sau khi từng phần hoàn tất; không đợi cuối buổi vì một số resource sẽ bị xóa khi cleanup. Tên ảnh dưới đây giữ nguyên để khớp cấu trúc workshop:

| Thư mục/ảnh | Nội dung cần chứng minh |
|---|---|
| `02-prerequisites/aws-cli/aws-cli-and-validation.png` | CLI trả đúng account/region và prefix list lookup thành công |
| `04-network/vpc/vpc-created.png` | VPC CIDR và DNS settings |
| `04-network/subnets-routes/private-route-tables.png` | Bốn subnet, route private-a→NAT-A và private-b→NAT-B |
| `04-network/vpc-endpoints/endpoints-created.png` | Một S3 Gateway Endpoint và hai NAT Gateway Available; không có Interface Endpoint |
| `05-secrets-manager/application-secret/key-names.png` | Secret name và bốn tên key; che value |
| `05-secrets-manager/iam/secret-read-policy.png` | Execution role chỉ có quyền đọc secret được chỉ định |
| `06-ecr/image-push/repository-created.png` | ECR private repository, immutable tag |
| `06-ecr/image-push/image-pushed.png` | Tag mới và digest image |
| `07-ecs/cluster-service/service-running.png` | Cluster/service, desired/running count |
| `07-ecs/health/target-group-health.png` | ECS task IP healthy |
| `08-s3/frontend-assets/frontend-assets.png` | `index.html` và `assets/` trong bucket riêng tư |
| `09-cloudfront/distribution/distribution-config.png` | S3 + ALB origins, `/api/*` → ALB, default → S3 |
| `09-cloudfront/spa-routing/function-live.png` | Function LIVE gắn ở Viewer request của default behavior |
| `09-cloudfront/invalidation/invalidation-complete.png` | Invalidation status Completed |
| `10-verification/browser-login/live-homepage.png` | Website CloudFront và trang sau đăng nhập; che email nếu cần |
| `10-verification/webhook-flow/webhook-flow.png` | Kịch bản webhook các bước hoàn tất |
| `10-verification/cloudwatch-logs/api-logs.png` | Log request test không có exception |
| `11-cleanup/cleanup-complete.png` | Các resource tính phí đã xóa/dừng và giữ lại bằng chứng cần thiết |

Không chụp Secret value, database password, publishable key nếu không cần thiết, JWT, email cá nhân, hoặc nội dung khách hàng thật. Với publishable key, vẫn nên che trong báo cáo; key này được phép ở frontend nhưng không cần lộ trong ảnh.

## 17. Cleanup sau demo

Cleanup chỉ sau khi đã lưu ảnh báo cáo và xác nhận không cần website hoạt động. Supabase project không bị xóa trong bước này.

### 17.1. Tắt request public trước

1. CloudFront → distribution → **Disable**; chờ status Deployed. Sau khi disabled, CloudFront không còn phục vụ website.
2. ECS → Cluster → Service → **Update** desired count `0`; chờ không còn Running tasks.
3. Xóa ECS service; sau đó deregister các Task Definition revision nếu cần.
4. EC2 → Load Balancers: xóa ALB; EC2 → Target Groups: xóa target group sau khi ALB không còn tham chiếu.

### 17.2. Xóa resource có phụ thuộc

Thứ tự quan trọng để tránh AWS từ chối xóa:

1. Xóa CloudFront distribution sau khi đã disable/deployed. Nếu báo origin/behavior reference, xóa behavior API trước khi xóa ALB origin; cuối cùng xóa distribution.
2. S3: bucket frontend → xóa hết versions/delete markers nếu versioning bật → xóa bucket. Lệnh `aws s3 rm --recursive` không xóa các object version cũ trong bucket versioned; dùng Empty bucket trong Console để xóa mọi version.
3. ECR: xóa repository `nexusoms-demo-api`, chọn xóa toàn bộ images khi Console hỏi.
4. Secrets Manager: chọn `nexusoms/demo/application` → Schedule deletion. Nếu cần xóa ngay cho demo, bật force delete chỉ khi bạn chắc chắn không còn task cần secret.
5. CloudWatch: xóa log group `/ecs/nexusoms-demo-api` sau khi đã tải/lưu log cần thiết.
6. VPC → Endpoints: xóa S3 Gateway Endpoint duy nhất. Bản triển khai này không có bốn Interface Endpoint cần xóa.
7. NAT Gateways: xóa NAT A và B; chờ Deleted.
8. Elastic IPs: release hai EIP NAT sau khi NAT đã xóa; kiểm tra không còn gắn resource khác.
9. Route tables: xóa route private-a/private-b và public route table sau khi xóa association; route table main mặc định không cần xóa.
10. Subnets: xóa bốn subnet.
11. IGW: detach khỏi VPC, sau đó delete.
12. Security Groups do bạn tạo: xóa ALB SG và task SG. Nếu SG còn được resource nào dùng, xóa resource đó trước.
13. Xóa VPC cuối cùng.
14. CloudTrail: nếu trail/bucket được tạo riêng cho demo, tắt trail trước; chỉ xóa audit bucket sau khi đã lưu evidence và xác nhận không còn cần. Bucket có versioning phải được làm rỗng hoàn toàn trước khi xóa.
15. IAM → Users → `nexusoms-demo-deployer`: deactivate rồi xóa Access Key; gỡ policy `AdministratorAccess`; sau đó xóa IAM user nếu không còn dùng. Trên máy local, chạy `aws configure list-profiles` để kiểm tra profile; chỉ xóa hai block `[profile nexusoms-demo]` trong `%USERPROFILE%\.aws\config` và `[nexusoms-demo]` trong `%USERPROFILE%\.aws\credentials`, không xóa cả hai file nếu còn profile khác.

VPC và NAT Gateway là phần dễ tiếp tục tạo chi phí; sau cleanup mở **VPC → NAT Gateways** xác nhận không còn NAT. Mở EC2 → Elastic IPs để kiểm tra không còn EIP chưa dùng; Billing → Bills/Cost Explorer để kiểm tra các dịch vụ khác.

Ảnh cần chụp: `11-cleanup/cleanup-complete.png` sau khi lưu bằng chứng và xác nhận các resource chính đã dừng/xóa.

## 18. Danh mục resource cần ghi lại

| Resource | Giá trị copy từ AWS | Đã chụp |
|---|---|---|
| AWS Account ID / Region |  | ☐ |
| VPC ID |  | ☐ |
| Public subnet A/B IDs |  | ☐ |
| Private subnet A/B IDs |  | ☐ |
| NAT Gateway A/B IDs và EIP |  | ☐ |
| CloudFront prefix list ID |  | ☐ |
| ECR repository URI và image tag/digest |  | ☐ |
| ECS cluster / service / task definition revision |  | ☐ |
| ALB DNS name / Target Group |  | ☐ |
| Frontend bucket name |  | ☐ |
| CloudFront domain / Distribution ID |  | ☐ |
| Secrets Manager secret ARN (không ghi secret value) |  | ☐ |
| CloudWatch log group | `/ecs/nexusoms-demo-api` | ☐ |

## 19. Tài liệu kỹ thuật chính thức để đối chiếu

- AWS ECS lấy JSON key từ Secrets Manager: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- AWS CloudFront Function rewrite URL cho SPA: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example_cloudfront_functions_url_rewrite_single_page_apps_section.html
- Supabase kết nối PostgreSQL và session pooler: https://supabase.com/docs/guides/database/connecting-to-postgres
- CloudFront invalidation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/invalidation-specifying-objects.html
