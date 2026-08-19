package com.whiteboard.app.service;

import com.amazonaws.auth.DefaultAWSCredentialsProviderChain;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.CannedAccessControlList;
import com.amazonaws.services.s3.model.ObjectMetadata;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.UUID;

// Uploads saved board images to S3. AWS credentials are picked up automatically
// from env vars / IAM role by DefaultAWSCredentialsProviderChain.
@Service
public class S3Service {

    @Value("${aws.s3.bucket}")
    private String bucket;

    @Value("${aws.region}")
    private String region;

    private AmazonS3 client() {
        return AmazonS3ClientBuilder.standard()
                .withRegion(region)
                .withCredentials(new DefaultAWSCredentialsProviderChain())
                .build();
    }

    // Accepts a data URL like "data:image/png;base64,...." and returns the S3 key it was saved under.
    public String uploadBoardImage(String dataUrl) {
        String base64Payload = dataUrl.substring(dataUrl.indexOf(',') + 1);
        byte[] bytes = Base64.getDecoder().decode(base64Payload);
        String key = "boards/" + UUID.randomUUID() + ".png";

        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentType("image/png");
        metadata.setContentLength(bytes.length);

        AmazonS3 s3 = client();
        s3.putObject(bucket, key, new ByteArrayInputStream(bytes), metadata);
        s3.setObjectAcl(bucket, key, CannedAccessControlList.PublicRead);

        return key;
    }
}
